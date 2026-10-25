"""Evaluate a saved VeriTex detector on OpenFake's held-out test distributions."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import torch
from PIL import Image, ImageOps
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from tqdm import tqdm

# The detector is PyTorch-only; avoid importing TensorFlow through Transformers.
os.environ.setdefault("USE_TF", "0")
from transformers import AutoImageProcessor, AutoModelForImageClassification

from data import DATASET_ID, LABEL_TO_ID, decode_image, openfake_stream
from runtime import resolve_device


def get_args():
    parser = argparse.ArgumentParser(description="Evaluate on OpenFake held-out test data.")
    parser.add_argument("--model-dir", type=Path, default=Path("/content/veritex-model"))
    parser.add_argument("--config", choices=("core", "reddit"), default="core")
    parser.add_argument("--split", default="test")
    parser.add_argument("--max-per-class", type=int, default=2_000)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--device", choices=("auto", "cuda", "tpu", "xla", "cpu"), default="auto")
    parser.add_argument("--output", type=Path, default=Path("/content/veritex-evaluation.json"))
    return parser.parse_args()


def main():
    args = get_args()
    device, backend, _xm = resolve_device(args.device, allow_cpu=args.device == "cpu")
    print(f"Evaluation device: {device} ({backend})")

    processor = AutoImageProcessor.from_pretrained(args.model_dir, use_fast=True)
    model = AutoModelForImageClassification.from_pretrained(args.model_dir).eval().to(device)
    labels: list[int] = []
    scores: list[float] = []
    counts = {label: 0 for label in LABEL_TO_ID}
    batch_images: list[Image.Image] = []
    batch_labels: list[int] = []
    stream = openfake_stream(args.config, args.split)

    def infer_batch():
        inputs = processor(images=batch_images, return_tensors="pt").to(device)
        with torch.inference_mode():
            if backend == "cuda":
                amp_context = torch.autocast("cuda", dtype=torch.float16)
            elif backend == "xla":
                amp_context = torch.autocast("xla", dtype=torch.bfloat16)
            else:
                from contextlib import nullcontext

                amp_context = nullcontext()
            with amp_context:
                probabilities = model(**inputs).logits.softmax(dim=-1)[:, LABEL_TO_ID["fake"]]
        scores.extend(probabilities.float().cpu().tolist())
        labels.extend(batch_labels)
        batch_images.clear()
        batch_labels.clear()

    for row in tqdm(stream, desc=f"Evaluating {args.config}/{args.split}"):
        label_name = str(row.get("label", "")).strip().lower()
        if label_name not in LABEL_TO_ID or counts[label_name] >= args.max_per_class:
            if all(count >= args.max_per_class for count in counts.values()):
                break
            continue
        try:
            image = decode_image(row.get("image"))
        except (OSError, ValueError):
            continue
        if image is None:
            continue
        batch_images.append(ImageOps.exif_transpose(image).convert("RGB"))
        batch_labels.append(LABEL_TO_ID[label_name])
        counts[label_name] += 1
        if len(batch_images) >= args.batch_size:
            infer_batch()
        if all(count >= args.max_per_class for count in counts.values()):
            break

    if batch_images:
        infer_batch()
    if len(set(labels)) < 2:
        raise RuntimeError(f"Could not collect both classes for evaluation: {counts}")

    predictions = [int(score >= 0.5) for score in scores]
    report = {
        "dataset": DATASET_ID,
        "config": args.config,
        "split": args.split,
        "examples_per_class": counts,
        "threshold_fake": 0.5,
        "accuracy": accuracy_score(labels, predictions),
        "precision_fake": precision_score(labels, predictions, pos_label=1, zero_division=0),
        "recall_fake": recall_score(labels, predictions, pos_label=1, zero_division=0),
        "f1_fake": f1_score(labels, predictions, pos_label=1, zero_division=0),
        "roc_auc": roc_auc_score(labels, scores),
        "confusion_matrix_real_fake": confusion_matrix(labels, predictions, labels=[0, 1]).tolist(),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
