"""OpenFake streaming and local image-folder helpers for VeriTex training."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from datasets import load_dataset
from PIL import Image, ImageOps
from tqdm import tqdm

DATASET_ID = "ComplexDataLab/OpenFake"
LABEL_TO_ID = {"real": 0, "fake": 1}
ID_TO_LABEL = {value: key for key, value in LABEL_TO_ID.items()}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def openfake_stream(config: str, split: str, seed: int | None = None):
    dataset = load_dataset(DATASET_ID, config, split=split, streaming=True)
    if seed is not None:
        dataset = dataset.shuffle(seed=seed, buffer_size=2_000)
    return dataset


def decode_image(value: Any) -> Image.Image | None:
    if isinstance(value, Image.Image):
        return value
    if isinstance(value, dict) and value.get("bytes"):
        from io import BytesIO

        return Image.open(BytesIO(value["bytes"]))
    if isinstance(value, dict) and value.get("path"):
        return Image.open(value["path"])
    return None


def count_class_images(root: Path, label: str) -> int:
    class_dir = root / label
    if not class_dir.is_dir():
        return 0
    return sum(
        1
        for path in class_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def collect_balanced_split(
    config: str,
    source_split: str,
    output_dir: Path,
    per_class: int,
    seed: int,
) -> dict[str, int]:
    """Stream and save a deterministic, balanced subset as resized JPEGs."""
    destinations = {label: output_dir / label for label in LABEL_TO_ID}
    for path in destinations.values():
        path.mkdir(parents=True, exist_ok=True)

    counts = {label: count_class_images(output_dir, label) for label in LABEL_TO_ID}
    for label, count in counts.items():
        if count > per_class:
            raise RuntimeError(
                f"Found {count} {label} images under {output_dir}; requested {per_class}. "
                "Choose a fresh --data-dir to prepare a smaller subset."
            )

    existing_files = [
        path
        for folder in destinations.values()
        for path in folder.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]
    existing_indices = []
    for path in existing_files:
        try:
            existing_indices.append(int(path.stem.rsplit("_", 1)[1]))
        except (IndexError, ValueError):
            raise RuntimeError(
                f"Cannot resume from unexpected file name {path.name}. "
                "Choose a fresh --data-dir."
            ) from None
    last_saved_index = max(existing_indices, default=-1)

    stream = openfake_stream(config, source_split, seed)
    missing_count = sum(per_class - count for count in counts.values())
    if missing_count == 0:
        return counts
    progress = tqdm(total=missing_count, desc=f"Preparing {output_dir.name}")

    for index, row in enumerate(stream):
        # Replaying a Hugging Face stream starts at its beginning. Skip rows
        # through the last saved index so an interrupted download can resume.
        if index <= last_saved_index:
            continue
        label = str(row.get("label", "")).strip().lower()
        if label not in LABEL_TO_ID or counts[label] >= per_class:
            if all(count >= per_class for count in counts.values()):
                break
            continue

        try:
            image = decode_image(row.get("image"))
            if image is None:
                continue
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((512, 512), Image.Resampling.LANCZOS)
            filename = f"{counts[label]:06d}_{index:09d}.jpg"
            image.save(destinations[label] / filename, format="JPEG", quality=90, optimize=True)
            counts[label] += 1
            progress.update(1)
        except (OSError, ValueError):
            continue

        if all(count >= per_class for count in counts.values()):
            break

    progress.close()
    if any(count != per_class for count in counts.values()):
        raise RuntimeError(
            f"Could not collect {per_class} images per class from {config}/{source_split}; got {counts}."
        )
    return counts


def image_folder_files(root: Path) -> list[tuple[Path, int]]:
    samples: list[tuple[Path, int]] = []
    for label, class_id in LABEL_TO_ID.items():
        class_dir = root / label
        if not class_dir.is_dir():
            raise FileNotFoundError(f"Expected image folder: {class_dir}")
        samples.extend(
            (path, class_id)
            for path in sorted(class_dir.rglob("*"))
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        )
    if not samples:
        raise RuntimeError(f"No images found under {root}")
    return samples


def parse_prepare_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stream a balanced OpenFake split to local storage.")
    parser.add_argument("--config", choices=("core", "reddit"), default="core")
    parser.add_argument("--source-split", default="train")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--per-class", type=int, default=5_000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if args.per_class <= 0:
        parser.error("--per-class must be greater than zero")
    return args


def main() -> None:
    args = parse_prepare_args()
    counts = collect_balanced_split(
        args.config, args.source_split, args.output_dir, args.per_class, args.seed
    )
    print(f"Prepared {sum(counts.values()):,} images: {counts}")


if __name__ == "__main__":
    main()
