from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import tensorflow as tf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import PIL.Image
import google.generativeai as genai
import io
import base64
import os

app = FastAPI(title="Poultry Disease Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Poultry Disease Detection API is running"}

@app.get("/healthz")
async def healthz():
    return {"status": "healthy"}

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
else:
    gemini_model = None

print("Loading Keras Models... (This might take a few seconds)")
model_a_final = tf.keras.models.load_model("poultry_bouncer_final.keras")
model_b_final = tf.keras.models.load_model("poultry_doctor_final.keras")
print("Models Loaded Successfully!")

disease_suggestions = {
    "Healthy": "Status: Clear.\n- Action: No medical intervention required.\n- Prevention: Maintain strict daily biosecurity, ensure dry bedding, and provide ad-libitum access to clean water and balanced feed.",
    "Bumblefoot": "Status: Bacterial Infection (Staphylococcus).\n- Immediate: Move bird to a soft-bedded isolation pen.\n- Treatment: Soak the affected foot in warm Epsom salt water for 15 minutes. Apply antimicrobial spray or drawing salve, and bandage securely with vet wrap.\n- Prevention: Lower roosting bars and remove sharp edges or splinters in the coop.",
    "CRD": "Status: Chronic Respiratory Disease (Mycoplasma) - HIGHLY CONTAGIOUS.\n- Immediate: Isolate bird immediately far from the main flock.\n- Treatment: Consult a veterinarian for targeted water-soluble antibiotics (e.g., Tylosin or Tetracycline) for the entire flock.\n- Care: Drastically improve coop ventilation to reduce ammonia levels. Add electrolytes to their water.",
    "Foul Pox": "Status: Viral Infection - SLOW SPREADING.\n- Immediate: Isolate affected birds to prevent transmission via pecking or mosquitoes.\n- Treatment: There is no direct cure for the virus. Apply iodine to scabs to prevent secondary bacterial infections.\n- Care: Provide a stress-free, warm environment and soft food to encourage eating.",
    "Infectious coryza": "Status: Acute Respiratory Bacterial Infection - HIGHLY CONTAGIOUS.\n- Immediate: Strict isolation of the infected bird.\n- Treatment: Consult a vet immediately for fast-acting antibiotics (e.g., Erythromycin or Sulfa drugs).\n- Warning: Recovered birds often remain lifelong carriers. Monitor the rest of the flock closely."
}

doctor_classes = ["Bumblefoot", "CRD", "Foul Pox", "Infectious coryza"]
all_classes = ["Healthy"] + doctor_classes
concern_threshold = 5.0

def image_to_base64(pil_image):
    buffered = io.BytesIO()
    pil_image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{img_str}"

def to_float(value):
    try:
        return float(value)
    except Exception:
        return 0.0

@app.post("/analyze")
async def analyze_poultry(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        pil_img = PIL.Image.open(io.BytesIO(contents)).convert("RGB")

        security_prompt = """
        You are an AI security filter for a veterinary application. Look at this image.
        Is it an image of a whole poultry bird, a specific poultry body part (like a foot, beak, or comb),
        or a poultry internal organ?
        You must ignore humans, dogs, cats, cars, and unrelated objects.
        Reply with exactly one word: 'TRUE' if it is poultry-related, or 'FALSE' if it is not.
        """

        if gemini_model is not None:
            try:
                security_response = gemini_model.generate_content([security_prompt, pil_img])
                if "TRUE" not in security_response.text.strip().upper():
                    return {
                        "status": "error",
                        "message": "Access Denied: Image does not contain a poultry bird, body part, or organ."
                    }
            except Exception:
                pass

        img_resized = pil_img.resize((224, 224))
        img_array = tf.keras.utils.img_to_array(img_resized)
        img_array = tf.expand_dims(img_array, 0)

        bouncer_prediction = model_a_final.predict(img_array, verbose=0)[0][0]
        doctor_prediction = model_b_final.predict(img_array, verbose=0)[0]

        p_sick = to_float(bouncer_prediction)
        p_healthy = 1.0 - p_sick

        unified_probs = [p_healthy * 100.0] + [p_sick * to_float(d_prob) * 100.0 for d_prob in doctor_prediction]

        detected_conditions = []
        if p_sick < 0.5:
            final_diagnosis = "Healthy"
            confidence = p_healthy * 100.0
            active_model = model_a_final
            detected_conditions.append(f"PRIMARY STATUS: Healthy ({confidence:.1f}%)")
        else:
            predicted_index = int(np.argmax(doctor_prediction))
            final_diagnosis = doctor_classes[predicted_index]
            confidence = unified_probs[predicted_index + 1]
            active_model = model_b_final
            detected_conditions.append(f"PRIMARY DIAGNOSIS: {final_diagnosis} ({confidence:.1f}%)")

        # IMPORTANT: convert every value to a plain Python float
        distribution_dict = {
            all_classes[i]: float(round(unified_probs[i], 1))
            for i in range(len(all_classes))
        }

        for i, disease in enumerate(doctor_classes):
            disease_prob = unified_probs[i + 1]
            if disease != final_diagnosis and disease_prob >= concern_threshold:
                detected_conditions.append(f"SECONDARY RISK: {disease} ({disease_prob:.1f}%)")

        conditions_str = "\n".join(detected_conditions)
        guidelines_str = "\n".join([f"- {k}: {v}" for k, v in disease_suggestions.items()])

        synthesis_prompt = f"""
        You are an Expert Avian Veterinarian AI Consultant.
        A custom diagnostic computer vision model has output the following probabilities for a bird:
        {conditions_str}

        Here are the ONLY approved veterinary guidelines you are allowed to use:
        {guidelines_str}

        Task: Write a highly structured, punchy, and attractive medical dashboard.

        CRITICAL RULES:
        1. Do NOT invent new medical advice outside the approved guidelines.
        2. Keep it strictly to short bullet points and bold text.
        3. TRANSPARENCY RULE: If the 'Healthy' probability is high, but a disease is listed as the 'PRIMARY DIAGNOSIS', you MUST add a brief '⚠️ AI Diagnostic Note' at the very top explaining that while the bird shows signs of health, the cumulative sickness indicators triggered a safety protocol to prioritize the bird's safety.
        4. Use exactly this format:

        ### 📊 DIAGNOSTIC BREAKDOWN
        (List the probabilities and add the AI Diagnostic Note here if necessary)

        ### 🚨 IMMEDIATE ACTION PLAN
        (Pull the 'Immediate' and 'Warning' steps from the guidelines)

        ### 🩺 ONGOING TREATMENT & CARE
        (Pull the 'Treatment', 'Care', and 'Prevention' steps from the guidelines)
        """

        if gemini_model is not None:
            try:
                report_response = gemini_model.generate_content(synthesis_prompt)
                final_medical_report = report_response.text
            except Exception:
                final_medical_report = "AI report unavailable."
        else:
            final_medical_report = "AI report unavailable."

        base_layer = [l for l in active_model.layers if "mobilenet" in l.name.lower()][0]
        last_conv = base_layer.get_layer("out_relu")
        conv_model = tf.keras.Model(base_layer.inputs, last_conv.output)

        classifier_input = tf.keras.Input(shape=last_conv.output.shape[1:])
        x = classifier_input
        for layer in active_model.layers[active_model.layers.index(base_layer) + 1:]:
            x = layer(x)
        classifier_model = tf.keras.Model(classifier_input, x)

        with tf.GradientTape() as tape:
            conv_outputs = conv_model(img_array)
            tape.watch(conv_outputs)
            preds = classifier_model(conv_outputs)
            top_class_channel = preds[:, 0] if preds.shape[1] == 1 else preds[:, tf.argmax(preds[0])]

        grads = tape.gradient(top_class_channel, conv_outputs)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        heatmap = tf.squeeze(conv_outputs[0] @ pooled_grads[..., tf.newaxis])
        heatmap = tf.maximum(heatmap, 0)

        max_heatmap = tf.math.reduce_max(heatmap)
        if max_heatmap != 0:
            heatmap = heatmap / max_heatmap

        heatmap_resized = tf.image.resize(heatmap[..., tf.newaxis], (224, 224)).numpy().squeeze()
        jet_heatmap = plt.get_cmap("jet")(np.arange(256))[:, :3][np.uint8(255 * heatmap_resized)]
        superimposed_img_array = np.clip(jet_heatmap * 0.4 + (img_array[0].numpy().astype("uint8") / 255.0), 0, 1)

        superimposed_pil = PIL.Image.fromarray((superimposed_img_array * 255).astype(np.uint8))

        return {
            "status": "success",
            "primary_diagnosis": final_diagnosis,
            "confidence": float(round(confidence, 1)),
            "report": final_medical_report,
            "distribution": distribution_dict,
            "original_image_base64": image_to_base64(pil_img),
            "heatmap_image_base64": image_to_base64(superimposed_pil)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()

        error_str = str(e).lower()
        if "429" in error_str or "quota" in error_str or "resourceexhausted" in error_str:
            return {
                "status": "error",
                "message": "AI Server is currently busy or rate-limited. Please wait about 60 seconds and try again!"
            }

        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
