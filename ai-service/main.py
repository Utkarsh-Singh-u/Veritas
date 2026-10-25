"""FastAPI inference service for the private VeriTex image classifier."""

from __future__ import annotations

import io
import hashlib
import os
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Automatically load local .env file if it exists
_env_file = Path(__file__).resolve().parent / ".env"
if _env_file.is_file():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _val = _line.split("=", 1)
            _key, _val = _key.strip(), _val.strip().strip("'\"")
            if _key and _key not in os.environ:
                os.environ[_key] = _val

MODEL_ID = os.getenv("HF_MODEL_ID", "Utkarsh-Singh/veritex-vit-openfake")
HF_TOKEN = os.getenv("HF_TOKEN")
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(20 * 1024 * 1024)))
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the private model once when the service starts."""
    try:
        app.state.processor = AutoImageProcessor.from_pretrained(
            MODEL_ID,
            token=HF_TOKEN,
            use_fast=True,
        )
        app.state.model = AutoModelForImageClassification.from_pretrained(
            MODEL_ID,
            token=HF_TOKEN,
        ).to(DEVICE)
        app.state.model.eval()
    except Exception as exc:
        raise RuntimeError(
            f"Could not load VeriTex model '{MODEL_ID}'. Check HF_MODEL_ID and that "
            "HF_TOKEN is set to a read-enabled token with access to the private repo."
        ) from exc
    yield
    del app.state.model
    del app.state.processor


app = FastAPI(title="VeriTex AI Image Detector", version="1.0.0", lifespan=lifespan)

# Allow requests from Chrome extensions, web apps, and local tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok" if hasattr(app.state, "model") else "not_ready",
        "model": MODEL_ID,
        "device": str(DEVICE),
    }


@app.post("/api/v1/predict/image")
async def predict_image(
    file: UploadFile | None = File(None),
    image: UploadFile | None = File(None),
):
    upload = file or image
    if not upload:
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)} MB upload limit.",
        )

    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            image_info = {
                "width": source.width,
                "height": source.height,
                "format": (source.format or "unknown").upper(),
                "has_exif": bool(source.getexif()),
                "camera_model": str(source.getexif().get(272, ""))[:100] or None,
                "software": str(source.getexif().get(305, ""))[:100] or None,
            }
            image_obj = ImageOps.exif_transpose(source).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc

    inputs = app.state.processor(images=image_obj, return_tensors="pt")
    inputs = {name: tensor.to(DEVICE) for name, tensor in inputs.items()}
    with torch.inference_mode():
        logits = app.state.model(**inputs).logits[0]
        probabilities = torch.softmax(logits, dim=-1)

    class_id = int(probabilities.argmax().item())
    raw_label = str(app.state.model.config.id2label.get(class_id, "")).strip().lower()
    if raw_label not in {"real", "fake"}:
        # The trained checkpoint uses real=0 and fake=1.
        raw_label = "fake" if class_id == 1 else "real"
    confidence = round(float(probabilities[class_id].item()) * 100, 2)
    class_scores = {
        str(app.state.model.config.id2label.get(index, f"class_{index}")).strip().lower(): round(
            float(probability.item()) * 100, 2
        )
        for index, probability in enumerate(probabilities)
    }
    image_info["sha256"] = hashlib.sha256(image_bytes).hexdigest()
    return {
        "status": "success",
        "verdict": raw_label,
        "confidence": confidence,
        "data": {
            "verdict": raw_label,
            "confidence": confidence,
            "class_scores": class_scores,
            "image_info": image_info,
            "notice": "Model output is a prediction, not proof of authenticity. EXIF metadata can be removed or edited.",
        },
    }
