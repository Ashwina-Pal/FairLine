import os
from dotenv import load_dotenv
from firebase_admin import credentials, initialize_app, firestore

# Load environment variables from .env file (automatically searches parent directories)
load_dotenv()

db = None

def init_firebase():
    global db
    if db is not None:
        return db
    
    cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
    if cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        cred = None
        
    try:
        # Try to initialize the default firebase app
        bucket_name = os.getenv('FIREBASE_STORAGE_BUCKET')
        options = {}
        if bucket_name:
            options['storageBucket'] = bucket_name
        initialize_app(cred, options)
        db = firestore.client()
        return db
    except ValueError:
        # App already initialized (common during development server reloads)
        db = firestore.client()
        return db
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        db = None
        raise e

def get_firestore_client():
    global db
    if db is None:
        db = init_firebase()
    return db