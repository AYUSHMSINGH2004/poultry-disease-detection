from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import tensorflow as tf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import PIL.Image
import google.generativeai as genai
import io
import base64
import os

app = FastAPI(title="Poultry Disease Detection API")

# ---------------- HEALTH CHECK ----------------
@app.get("/")
async def root():
    return {"status": "ok", "message": "API running"}

@app.get("/healthz")
async def health():
    return {"status": "healthy"}

# ---------------- CORS FIX ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # IMPORTANT: allows Vercel frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- ENV ----------------
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
else:
    gemini_model = None  # Prevent crash

# ---------------- LOAD MODELS ----------------
print("Loading models...")
model_a_final = tf.keras.models.load_model("poultry_bouncer_final.keras")
model_b_final = tf.keras.models.load_model("poultry_doctor_final.keras")
print("Models loaded")

# ---------------- CONSTANTS ----------------
doctor_classes = ['Bumblefoot', 'CRD', 'Foul Pox', 'Infectious coryza']
all_classes = ['Healthy'] + doctor_classes

# ---------------- HELPER ----------------
def image_to_base64(pil_image):
    buffer = io.BytesIO()
    pil_image.save(buffer, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()

# ---------------- MAIN API ----------------
@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        pil_img = PIL.Image.open(io.BytesIO(contents)).convert("RGB")

        # Resize
        img = pil_img.resize((224, 224))
        img_array = tf.keras.utils.img_to_array(img)
        img_array = tf.expand_dims(img_array, 0)

        # Predictions
        bouncer_pred = model_a_final.predict(img_array)[0][0]
        doctor_pred = model_b_final.predict(img_array)[0]

        if bouncer_pred < 0.5:
            diagnosis = "Healthy"
            confidence = (1 - bouncer_pred) * 100
        else:
            idx = np.argmax(doctor_pred)
            diagnosis = doctor_classes[idx]
            confidence = doctor_pred[idx] * 100

        # ---------------- SIMPLE AI REPORT ----------------
        if gemini_model:
            try:
                prompt = f"Give short veterinary advice for {diagnosis}"
                response = gemini_model.generate_content(prompt)
                report = response.text
            except:
                report = "AI advice unavailable"
        else:
            report = "AI disabled (no API key)"

        # ---------------- RESPONSE ----------------
        return {
            "status": "success",
            "diagnosis": diagnosis,
            "confidence": round(confidence, 2),
            "report": report,
            "image": image_to_base64(pil_img)
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# ---------------- RUN ----------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
