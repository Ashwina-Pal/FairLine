from contextlib import asynccontextmanager
from fastapi import FastAPI
from firebase_admin import firestore
from backend.firebase import init_firebase, get_firestore_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_firebase()
        print("Firebase Admin SDK successfully initialized.")
    except Exception as e:
        print(f"Firebase Admin SDK initialization failed on startup: {e}")
    yield

app = FastAPI(lifespan=lifespan)

# Configure CORS to allow local Next.js client access
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits all local web development ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads directory for static receipt image serving fallback
import os
from fastapi.staticfiles import StaticFiles
os.makedirs("backend/static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Register Claims endpoints
from backend.routes.claims import router as claims_router
app.include_router(claims_router)

@app.get("/health")
def health_check():
    try:
        db = get_firestore_client()
        db.collection("healthcheck").document("test").set({"timestamp": firestore.SERVER_TIMESTAMP})
        doc = db.collection("healthcheck").document("test").get()
        if doc.exists:
            return {"status": "ok", "firestore": True}
        else:
            return {"status": "error", "firestore": False}
    except Exception as e:
        print(f"Error checking health: {e}")
        return {"status": "error", "firestore": False}