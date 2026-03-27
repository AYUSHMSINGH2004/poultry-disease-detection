# 🐔 Poultry Disease Detection & AI Consultation System

AI-powered veterinary web app that detects poultry diseases from images and delivers actionable medical guidance. Uses a hierarchical ML model to reduce false negatives and a constrained LLM to provide reliable, grounded diagnostic insights for better decision-making.

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-green)
![React](https://img.shields.io/badge/React-UI-blue)
![TensorFlow](https://img.shields.io/badge/TensorFlow-Keras-orange)

## 📖 Abstract & Executive Summary
This project presents an end-to-end, AI-powered veterinary diagnostic system designed to identify poultry diseases from images and provide actionable, grounded medical advice. 

To prioritize reducing false negatives (failing to identify a sick bird), the system utilizes a **Hierarchical Convolutional Neural Network (CNN) Architecture** comprised of two stages: a "Bouncer" model for binary triage (Healthy vs. Sick) and a "Doctor" model for multi-class disease classification. 

The visual predictions and Grad-CAM heatmaps are securely fed into a large language model (**Gemini 2.5 Flash**) using a Grounded Generation framework to synthesize a professional, highly structured veterinary action plan based strictly on approved medical dictionaries.

---

## 🏗️ Data Processing & Pipeline Architecture
The foundation of the model relies on a robust data pipeline that merges original datasets with Roboflow-translated datasets.
* **Data Cleaning:** A custom TensorFlow silent cleaner was deployed to scrub the dataset of corrupt or invalid files before training, ensuring mathematical stability during gradient descent.
* The data was split into two distinct environments to support the hierarchical training architecture.

---

## 🧠 The Hierarchical Vision Models

A standard "flat" multi-class model calculates probabilities as a popularity contest, which can lead to dangerous false negatives if symptoms are ambiguous. To prevent this, the diagnostic logic is split into two distinct neural networks.

### Phase 1: The "Bouncer" Model (Binary Triage)
The Bouncer is a binary classification model designed to answer one question: *Is this bird healthy or sick?* * The model calculates the cumulative probability of sickness: `P(Sick) = 1 - P(Healthy)`.
* If `P(Sick) > 0.5`, the bird is flagged for intervention, and the image is passed to the next stage.
* **Performance:**
  * **Accuracy:** 82%
  * **Precision (Sick):** 90%
  * **Recall (Sick):** 82%
* **Analysis:** The Bouncer achieved an excellent 90% precision on sick birds. The overall F1-score of 0.81 proves strong reliability in the initial triage phase.

### Phase 2: The "Doctor" Model (Multi-Disease Classification)
Once a bird is triaged as "Sick", the Doctor model analyzes the visual features to classify the specific condition among four targets: Bumblefoot, CRD, Foul Pox, and Infectious Coryza.
* **Accuracy:** 72%
* **CRD Performance:** Exceptionally strong (F1-Score: 0.81), with high precision (0.80) and recall (0.82).
* **Foul Pox Performance:** High sensitivity/recall (0.90), meaning the model rarely misses a case, though it occasionally over-predicts it (Precision: 0.53).
* **Analysis:** The model's confidence distribution shows a healthy bell curve, primarily clustering between 50% and 80% confidence, indicating calculated decisions rather than extreme guesses.

---

## 🔍 Explainable AI & Grounded Generation
To bridge the gap between computer vision math and human-readable advice, the system employs two advanced AI techniques:

1. **Grad-CAM Heatmaps (Explainability):** The backend generates a visual heatmap highlighting the exact pixels and anatomical regions the CNN focused on to make its diagnosis.
2. **Grounded Gemini Synthesizer (Actionable Output):** The system passes the probability distribution into a Gemini LLM prompt constraint. Gemini reads the probabilities and maps them to a hardcoded veterinary dictionary, outputting a formatted dashboard (Diagnostic Breakdown, Immediate Action Plan, Ongoing Care) without hallucinating unapproved treatments.

---

## 💻 Production Deployment & Web Architecture
The transition from a local prototype to a fully functional web application was achieved using a modern Client-Server architecture.

* **The Backend (FastAPI):** The Keras models and Gemini integration were bundled into a headless Python FastAPI server. The backend handles image processing, Base64 encoding for the Grad-CAM visuals, JSON payload formatting, robust CORS middleware, and Error 429 (Rate Limit) handling.
* **The Frontend (Hostinger Horizons):** A sleek, React-based UI handles image uploads, loading states, and Markdown parsing.
* **Local Deployment Setup:** Both the frontend and backend are executed locally on the same machine. The frontend communicates directly with the FastAPI backend via `http://127.0.0.1:8000`.

---

## 👥 Contributors
* **Ayush M Singh** (23BDS0033)
* **Venkata Sriram Topalli** (23BCE0441)
* **Ojas Arora** (23BDS0235)
* **Kanhaiya** (23BDS0238)
* **Bishal Kumar Mandal** (23BDS0332)
