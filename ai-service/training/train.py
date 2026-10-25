"""Full fine-tuning of a pretrained Hugging Face image classifier."""

from __future__ import annotations

import argparse
import json
import os
import random
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageOps
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from torch.utils.data import DataLoader, Dataset
from tqdm import tqdm

# The detector is PyTorch-only; avoid importing TensorFlow through Transformers.
os.environ.setdefault("USE_TF", "0")
from transformers import AutoImageProcessor, AutoModelForImageClassification

from data import (
    ID_TO_LABEL,
    LABEL_TO_ID,
    collect_balanced_split,
    count_class_images,
    image_folder_files,
)
from runtime import resolve_device


class LocalImages(Dataset):
    def __init__(self, root: Path, processor, training: bool = False):
        self.samples = image_folder_files(root)
        self.processor = processor
        self.training = training

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        path, label = self.samples[index]
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
        if self.training and random.random() < 0.5:
            image = ImageOps.mirror(image)
        pixel_values = self.processor(images=image, return_tensors="pt")["pixel_values"][0]
        return pixel_values, label


def batch_collate(items):
    pixels, labels = zip(*items)
    return torch.stack(pixels), torch.tensor(labels, dtype=torch.long)


@torch.inference_mode()
def evaluate(model, loader, device, backend, amp_dtype):
    model.eval()
    y_true: list[int] = []
    y_pred: list[int] = []
    for pixel_values, labels in tqdm(loader, desc="Validating", leave=False):
        pixel_values = pixel_values.to(device, non_blocking=backend == "cuda")
        if backend in ("cuda", "xla"):
            amp_context = torch.autocast(device_type=backend, dtype=amp_dtype)
        else:
            from contextlib import nullcontext

            amp_context = nullcontext()
        with amp_context:
            logits = model(pixel_values=pixel_values).logits
        y_true.extend(labels.tolist())
        y_pred.extend(logits.argmax(dim=-1).cpu().tolist())
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision_fake": precision_score(y_true, y_pred, pos_label=1, zero_division=0),
        "recall_fake": recall_score(y_true, y_pred, pos_label=1, zero_division=0),
        "f1_fake": f1_score(y_true, y_pred, pos_label=1, zero_division=0),
    }


def get_args():
    parser = argparse.ArgumentParser(description="Fine-tune and evaluate VeriTex image detector.")
    parser.add_argument("--data-dir", type=Path, default=Path("/content/veritex-data"))
    parser.add_argument("--output-dir", type=Path, default=Path("/content/veritex-model"))
    parser.add_argument("--model", default="google/vit-base-patch16-224-in21k")
    parser.add_argument("--per-class", type=int, default=5_000)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--grad-accumulation", type=int, default=2)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--device", choices=("auto", "cuda", "tpu", "xla"), default="auto")
    parser.add_argument("--push-to-hub", action="store_true")
    parser.add_argument("--hub-model-id", default=None)
    args = parser.parse_args()
    if args.push_to_hub and not args.hub_model_id:
        parser.error("--hub-model-id is required with --push-to-hub")
    return args


def main():
    args = get_args()
    device, backend, xm = resolve_device(args.device)
    print(f"Training device: {device} ({backend})")
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if backend == "cuda":
        torch.cuda.manual_seed_all(args.seed)
        torch.backends.cuda.matmul.allow_tf32 = True

    for split in ("train", "validation"):
        split_dir = args.data_dir / split
        counts = {label: count_class_images(split_dir, label) for label in LABEL_TO_ID}
        if any(count != args.per_class for count in counts.values()):
            collect_balanced_split(
                "core", split, split_dir, args.per_class, args.seed + (0 if split == "train" else 1)
            )

    id2label = {int(key): value for key, value in ID_TO_LABEL.items()}
    processor = AutoImageProcessor.from_pretrained(args.model, use_fast=True)
    model = AutoModelForImageClassification.from_pretrained(
        args.model,
        num_labels=len(LABEL_TO_ID),
        id2label=id2label,
        label2id=LABEL_TO_ID,
        ignore_mismatched_sizes=True,
    )
    model.gradient_checkpointing_enable()
    model.to(device)

    if backend == "cuda":
        use_bf16 = torch.cuda.is_bf16_supported()
        amp_dtype = torch.bfloat16 if use_bf16 else torch.float16
        scaler = torch.amp.GradScaler("cuda", enabled=not use_bf16)
        num_workers = args.num_workers
    elif backend == "xla":
        use_bf16 = True
        amp_dtype = torch.bfloat16
        scaler = None
        num_workers = 0
    elif backend == "tpu":
        use_bf16 = True
        amp_dtype = torch.bfloat16
        scaler = None
        num_workers = 0
    else:
        use_bf16 = False
        amp_dtype = torch.float32
        scaler = None
        num_workers = args.num_workers

    train_data = LocalImages(args.data_dir / "train", processor, training=True)
    validation_data = LocalImages(args.data_dir / "validation", processor)
    train_loader = DataLoader(
        train_data,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=backend == "cuda",
        collate_fn=batch_collate,
    )
    validation_loader = DataLoader(
        validation_data,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=backend == "cuda",
        collate_fn=batch_collate,
    )

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.01)
    accumulation = max(1, args.grad_accumulation)
    best_f1 = -1.0
    args.output_dir.mkdir(parents=True, exist_ok=True)
    history = []

    for epoch in range(args.epochs):
        model.train()
        optimizer.zero_grad(set_to_none=True)
        running_loss = 0.0
        progress = tqdm(enumerate(train_loader), total=len(train_loader), desc=f"Epoch {epoch + 1}/{args.epochs}")
        for step, (pixel_values, labels) in progress:
            pixel_values = pixel_values.to(device, non_blocking=backend == "cuda")
            labels = labels.to(device, non_blocking=backend == "cuda")
            if backend in ("cuda", "xla"):
                amp_context = torch.autocast(device_type=backend, dtype=amp_dtype)
            else:
                from contextlib import nullcontext

                amp_context = nullcontext()
            with amp_context:
                loss = model(pixel_values=pixel_values, labels=labels).loss / accumulation
            if scaler is not None:
                scaler.scale(loss).backward()
            else:
                loss.backward()
            if (step + 1) % accumulation == 0 or step + 1 == len(train_loader):
                if scaler is not None:
                    scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                if backend == "xla":
                    xm.optimizer_step(optimizer, barrier=True)
                elif scaler is not None:
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    optimizer.step()
                optimizer.zero_grad(set_to_none=True)
            running_loss += loss.item() * accumulation
            progress.set_postfix(loss=f"{running_loss / (step + 1):.4f}")

        metrics = evaluate(model, validation_loader, device, backend, amp_dtype)
        record = {"epoch": epoch + 1, "train_loss": running_loss / len(train_loader), **metrics}
        history.append(record)
        print(json.dumps(record, indent=2))
        if metrics["f1_fake"] > best_f1:
            best_f1 = metrics["f1_fake"]
            if backend in ("xla", "tpu"):
                model.to("cpu")
                model.save_pretrained(args.output_dir, safe_serialization=True)
                model.to(device)
            else:
                model.save_pretrained(args.output_dir, safe_serialization=True)
            processor.save_pretrained(args.output_dir)
            (args.output_dir / "training_config.json").write_text(
                json.dumps(
                    {
                        "dataset": "ComplexDataLab/OpenFake",
                        "dataset_config": "core",
                        "training_split": "train",
                        "validation_split": "validation",
                        "per_class": args.per_class,
                        "seed": args.seed,
                        "best_validation_f1_fake": best_f1,
                        "label2id": LABEL_TO_ID,
                        "id2label": id2label,
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

    (args.output_dir / "training_metrics.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    if args.push_to_hub:
        # Log in with `huggingface-cli login` or the Colab secret before this upload.
        best_model = AutoModelForImageClassification.from_pretrained(args.output_dir)
        best_model.push_to_hub(args.hub_model_id, private=True)
        processor.push_to_hub(args.hub_model_id, private=True)
        print(f"Uploaded private model: https://huggingface.co/{args.hub_model_id}")


if __name__ == "__main__":
    main()
