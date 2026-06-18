from fastapi import FastAPI,UploadFile,File,HTTPException
from transformers import pipeline
from PIL import Image
import io

app=FastAPI(title="Deepfake")

pipe=pipeline("image-classification",model="haywoodsloan/ai-image-detector-dev-deploy")

@app.post("/api/v1/predict/image")
async def predict_image(file:UploadFile=File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400,detail="File must be an image.")

    try:
        image_bytes=await file.read()
        image=Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results=pipe(image)
        formatted_results={res['label'].lower(): round(res['score'] * 100, 2) for res in results}
        verdict=max(formatted_results,key=formatted_results.get)
        return {
            "status":"success 200",
            "verdict":verdict,
            "confidence":formatted_results[verdict]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))