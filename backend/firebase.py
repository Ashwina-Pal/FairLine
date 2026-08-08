import os
from firebase_admin import credentials, initialize_app, firestore
from dotenv import load_dotenv

load_dotenv()

db = None

def init_firebase():
    """Initializes the Firebase Admin SDK using the configured credentials path."""
    global db
    if db is not None:
        return db

    cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
    if cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        cred = None

    try:
        initialize_app(cred)
        db = firestore.client()
        return db
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        raise e

def get_firestore_client():
    if db is None:
        raise RuntimeError("Firestore client is not initialized. Check your credentials.")
    return db





