import os
from firebase_admin import credentials, initialize_app, firestore
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')

if cred_path:
    cred = credentials.Certificate(cred_path)
else:
    cred = None

db = None

try:
    app = initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Error initializing Firebase: {e}")

def get_firestore_client():
    if db is None:
        raise RuntimeError("Firestore client is not initialized. Check your credentials.")
    return db