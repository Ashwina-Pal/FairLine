# ==========================================
# CUSTOM AGENT: Receipt Extraction Agent
# ==========================================
# This is the designated "Custom Agent" for the FairLine expense system.
# It uses Gemini 1.5 Flash to extract structured key-value pairs (merchant,
# total_amount, date, confidence_score) from unstructured receipt images.
# ==========================================

import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from backend.models import ExtractedData

# Load environment variables (searches parent directories for .env)
load_dotenv()

_client = None

def get_gemini_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in environment variables.")
        _client = genai.Client(api_key=api_key)
    return _client

def extract_receipt_data(image_bytes: bytes, mime_type: str = "image/jpeg") -> ExtractedData:
    """
    Extracts structured receipt information from receipt image bytes.
    Uses Gemini 1.5 Flash Vision capabilities and forces structured output
    matching the ExtractedData schema.
    """
    client = get_gemini_client()

    prompt = (
        "You are the Custom Agent for receipt data extraction. "
        "Analyze the receipt image carefully. "
        "Extract the merchant name, total transaction amount, and the transaction date. "
        "Also estimate your extraction confidence score between 0.0 and 1.0 based on image legibility. "
        "If the date is present in another format (e.g. MM/DD/YYYY), convert it to YYYY-MM-DD. "
        "Return the output strictly adhering to the schema."
    )


    try:
        # Generate content using Gemini 1.5 Flash with structured schema configuration
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                ),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedData,
            ),
        )

        # Since we set response_schema, response.text is guaranteed to be structured JSON matching ExtractedData
        if not response.text:
            raise ValueError("Empty response received from Gemini Vision API.")

        extracted_json = json.loads(response.text)
        return ExtractedData(**extracted_json)

    except Exception as e:
        print(f"Error during receipt extraction agent execution: {e}")
        # Re-raise with a clear explanation
        raise RuntimeError(f"Receipt extraction failed: {str(e)}") from e
