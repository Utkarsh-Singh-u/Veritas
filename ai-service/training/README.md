# VeriTex image detector training

This folder fine-tunes a pretrained vision model for binary AI-generated image detection. It streams OpenFake directly from Hugging Face, prepares a balanced local subset, fully fine-tunes every model layer, evaluates on the dataset's validation split, and can evaluate on the held-out out-of-distribution and in-the-wild test splits.

The FastAPI inference service loads the fine-tuned model from the private Hugging Face repository. See the serving setup below.

## Dataset and intended use

The default dataset is [`ComplexDataLab/OpenFake`](https://huggingface.co/datasets/ComplexDataLab/OpenFake), configuration `core`. Its `train` and `validation` splits are used for training/model selection. Do not use its test data for training. The `core/test` split measures performance on held-out generators and a different real-image distribution; `reddit/test` is a separate in-the-wild check.

The dataset is labeled `CC-BY-NC-4.0` by its maintainers. This scaffold is intended for personal/non-commercial experimentation. Do not use the resulting model in a paid service unless you have confirmed the applicable dataset and model rights.

## Colab setup

1. Create a Colab notebook and choose **Runtime → Change runtime type → T4 GPU** (or another CUDA GPU). If GPU compute is unavailable, choose **v5e-1 TPU**.
2. Clone or upload this project to Colab, then change into `ai-service/training`.
3. Install the dependencies below. Colab already provides CUDA-enabled PyTorch, so this file deliberately does not replace its PyTorch build.

```bash
!pip install -r requirements.txt
!python -c "import torch, importlib.util; print('CUDA:', torch.cuda.is_available()); print('TorchTPU:', importlib.util.find_spec('torch_tpu') is not None)"
```

OpenFake is public, so a Hugging Face token is not needed to read it. To upload your model, create a private model repository in your Hugging Face account, store a write token in Colab Secrets as `HF_TOKEN`, then log in without putting the token in notebook output:

```python
from google.colab import userdata
from huggingface_hub import login
login(userdata.get("HF_TOKEN"))
```

## Prepare a balanced subset and fine-tune

The default is 5,000 `real` and 5,000 `fake` training images, plus the same number per class from validation. The selected images are resized to 512 pixels and saved locally, so training epochs do not repeatedly stream the dataset. Adjust `--per-class` if Colab storage or session time is limited. Use a fresh `--data-dir` when preparing a new subset.

```bash
!python train.py \
  --data-dir /content/veritex-data \
  --output-dir /content/veritex-model \
  --per-class 5000 \
  --epochs 3 \
  --batch-size 8 \
  --grad-accumulation 2
```

This fully fine-tunes `google/vit-base-patch16-224-in21k` with gradient checkpointing. Device selection defaults to `auto`: CUDA first, then native TorchTPU, then legacy PyTorch/XLA. For current Colab TPU runtimes, use `--device tpu`. TorchTPU uses ordinary PyTorch device and optimizer APIs; the runtime handles TPU execution. Its first steps may take longer while kernels initialize. On a T4 GPU, start at batch size 8; if memory runs out, reduce it to 4 and keep gradient accumulation at 2 or 4. The code records class IDs consistently: `real=0`, `fake=1`. It saves the best validation-F1 checkpoint, the image processor, label mapping, and per-epoch metrics.

For TPU, set the Colab accelerator to **v5e-1 TPU**, reconnect, and verify that `import torch_tpu` succeeds and `torch.accelerator.current_accelerator()` reports `tpu`. The current TorchTPU backend uses the `--device tpu` option. The Colab TPU runtime supplies the compatible package; avoid installing `torch_xla` or replacing Colab's PyTorch build.

## Evaluate held-out data

Run both test configurations; each defaults to a balanced sample of 2,000 images per class.

```bash
!python evaluate.py --model-dir /content/veritex-model --config core --split test \
  --output /content/veritex-core-test.json
!python evaluate.py --model-dir /content/veritex-model --config reddit --split test \
  --output /content/veritex-reddit-test.json
```

Evaluation also supports `--device tpu` on a TPU. `--device cpu` is available for small checks when no accelerator is available, but will be slower.

Reports include accuracy, fake precision/recall/F1, ROC-AUC, and a confusion matrix. These test runs stream examples and do not download the complete 3.45 TB dataset. Record the sample cap with results when comparing runs.

## Upload a private model to Hugging Face

After logging in with a write token, choose a repository name you own and pass it explicitly:

```bash
!python train.py \
  --data-dir /content/veritex-data \
  --output-dir /content/veritex-model \
  --per-class 5000 --epochs 3 --batch-size 8 --grad-accumulation 2 \
  --push-to-hub --hub-model-id YOUR_USERNAME/veritex-vit-openfake
```

The model repository is created/uploaded as private. The training run also saves files locally in `/content/veritex-model`.

## Run the FastAPI service with the private model

The API reads `HF_MODEL_ID` and `HF_TOKEN` from environment variables. The default model ID is `Utkarsh-Singh/veritex-vit-openfake`. Create a **read** token that can access this private repository and set it as `HF_TOKEN` in your local environment or deployment secret manager. Never put the token in source code, a notebook cell, or a committed `.env` file. `ai-service/.env.example` lists the supported settings.

From the `ai-service` directory, install its serving requirements and start the API:

```bash
pip install -r requirements.txt
# Set HF_TOKEN in your shell or deployment secrets before starting the server.
uvicorn main:app --host 0.0.0.0 --port 7860
```

The model downloads from the private Hub repo when the process starts and is cached by Hugging Face for later restarts. Check readiness at `GET /health`. Send an image as multipart form field `file` to `POST /api/v1/predict/image`; the response contains `verdict` (`real` or `fake`) and the winning class confidence as a percentage. Images larger than 20 MB are rejected.

The existing Node backend expects the same prediction path and response shape. Set `AI_SERVICE_URL` to `http://<ai-service-host>:7860/api/v1/predict/image`; its client sends the uploaded image as the `file` field.

## Outputs

- `model.safetensors`, model config, and image processor in the output directory
- `training_config.json` with dataset, split, seed, and label mapping
- `training_metrics.json` with validation metrics per epoch
- Evaluation JSON reports for `core/test` and `reddit/test`

This project trains an image classifier, not an LLM. Full fine-tuning means all vision-model weights are updated.
