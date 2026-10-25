"""Choose CUDA, native TorchTPU, legacy PyTorch/XLA, or CPU devices."""

from __future__ import annotations

import importlib
import importlib.util
import torch


def resolve_device(preference: str = "auto", allow_cpu: bool = False):
    """Return (device, backend, backend API). Auto prefers CUDA, then TPU, then CPU."""
    if preference in ("auto", "cuda") and torch.cuda.is_available():
        return torch.device("cuda"), "cuda", None
    if preference == "cuda":
        raise RuntimeError("CUDA was requested, but PyTorch cannot see a CUDA GPU.")

    if preference in ("auto", "tpu") and importlib.util.find_spec("torch_tpu") is not None:
        importlib.import_module("torch_tpu")  # Registers the native PyTorch TPU device.
        return torch.device("tpu"), "tpu", None
    if preference == "tpu":
        raise RuntimeError(
            "TPU was requested, but torch_tpu is not installed. Select a Colab TPU runtime "
            "with its TorchTPU package available."
        )

    if preference in ("auto", "xla"):
        try:
            xm = importlib.import_module("torch_xla.core.xla_model")
            device = xm.xla_device()
            return device, "xla", xm
        except (ImportError, RuntimeError) as error:
            if preference == "xla":
                raise RuntimeError(
                    "PyTorch/XLA was requested but could not initialize. For current Colab TPU "
                    "runtimes, use --device tpu with the torch_tpu package."
                ) from error

    if allow_cpu:
        return torch.device("cpu"), "cpu", None
    raise RuntimeError("No supported accelerator was found. Select a CUDA GPU or TPU in Colab.")
