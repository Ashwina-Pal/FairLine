from fastapi import FastAPI
from backend.firebase import get_firestore_client

app = FastAPI()

@app.on_event("startup")
def startup_event():
    get_firestore_client()

@app.get("/health")
def health_check():
    db = get_firestore_client()
    try:
        db.collection("healthcheck").document("test").set({"timestamp": "test"})
        doc = db.collection("healthcheck").document("test").get()
        if doc.exists:
            return {"status": "ok", "firestore": True}
        else:
            return {"status": "error", "firestore": False}
    except Exception as e:
        print(f"Error checking health: {e}")
        return {"status": "error", "firestore": False}