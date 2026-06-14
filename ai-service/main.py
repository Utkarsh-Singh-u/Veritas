from fastapi import FastAPI,UploadFile,File,HTTPException
from transformers import pipeline
from facenet_pytorch import MTCNN
from PIL import Image
import io

app=FastAPI(title="Deepfake")

print("Face Detector Loading...")
mtcnn=MTCNN(keep_all=False,device='cpu')

print("Deepfake AI Loading...")
pipe=pipeline("image-classification",model="dima806/deepfake_vs_real_image_detection")
print("All Systems Loaded!")

@app.post("/api/v1/predict/image")
async def predict_image(file:UploadFile=File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400,detail="File must be an image.")

    try:
        image_bytes=await file.read()
        image=Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # check for human faces
        boxes, _ =mtcnn.detect(image)
        
        if boxes is None:
            return {
                "status":"failed",
                "message":"No human face detected in the image. Please upload a clear human portrait."
            }

        results=pipe(image)
        formatted_results={res['label'].lower(): round(res['score'] * 100, 2) for res in results}
        verdict=max(formatted_results,key=formatted_results.get)

        return {
            "status":"success 200",
            "faces_detected":len(boxes),
            "verdict":verdict,
            "confidence":formatted_results[verdict]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))