import os
from unittest.mock import MagicMock, patch

import pytest
from backend.agents.receipt_extraction_agent import extract_receipt_data
from backend.models import ExtractedData

# Dummy image bytes for testing
DUMMY_IMAGE_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"  # noqa: E501


@patch("backend.agents.receipt_extraction_agent.get_gemini_client")
def test_extract_receipt_data_mocked(mock_get_client):
    """Verifies receipt extraction using a mocked Gemini client."""
    # Set up the mock response from Gemini
    mock_gemini_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"merchant": "Target", "total_amount": 34.50, "date": "2026-08-07", "confidence_score": 0.92}'

    mock_gemini_client.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_gemini_client

    result = extract_receipt_data(DUMMY_IMAGE_BYTES, mime_type="image/png")

    assert isinstance(result, ExtractedData)
    assert result.merchant == "Target"
    assert result.total_amount == 34.50
    assert result.date == "2026-08-07"
    assert result.confidence_score == 0.92

    # Assert generate_content was called
    mock_gemini_client.models.generate_content.assert_called_once()


@patch("backend.agents.receipt_extraction_agent.os.getenv")
@patch("backend.agents.receipt_extraction_agent._client", None)  # Reset cached singleton
def test_extract_receipt_data_missing_api_key(mock_getenv):
    """ValueError should be raised if GEMINI_API_KEY environment variable is missing."""
    mock_getenv.return_value = None  # Simulate missing environment variable

    with pytest.raises(ValueError) as excinfo:
        extract_receipt_data(DUMMY_IMAGE_BYTES)
    assert "GEMINI_API_KEY is not set" in str(excinfo.value)


@patch("backend.agents.receipt_extraction_agent.get_gemini_client")
def test_extract_receipt_data_api_exception(mock_get_client):
    """RuntimeError should be raised if the Gemini client raises an exception."""
    mock_gemini_client = MagicMock()
    mock_gemini_client.models.generate_content.side_effect = Exception("API connection timeout")
    mock_get_client.return_value = mock_gemini_client

    with pytest.raises(RuntimeError) as excinfo:
        extract_receipt_data(DUMMY_IMAGE_BYTES)
    assert "Receipt extraction failed" in str(excinfo.value)
    assert "API connection timeout" in str(excinfo.value)


@patch("backend.agents.receipt_extraction_agent.get_gemini_client")
def test_extract_receipt_data_empty_response(mock_get_client):
    """ValueError should be raised if Gemini returns an empty or invalid text response."""
    mock_gemini_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = ""  # Simulate empty response text
    mock_gemini_client.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_gemini_client

    with pytest.raises(RuntimeError) as excinfo:
        extract_receipt_data(DUMMY_IMAGE_BYTES)
    assert "Empty response received" in str(excinfo.value)


def test_extract_receipt_data_real_integration():
    """
    Integration test that runs on actual receipt files in fixtures folder
    only if the GEMINI_API_KEY is available and fixtures exist.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    fixtures_dir = os.path.join(os.path.dirname(__file__), "fixtures")

    # Skip if environment is not set up
    if not api_key:
        pytest.skip("GEMINI_API_KEY is not set. Skipping integration test.")
    if not os.path.exists(fixtures_dir) or not os.listdir(fixtures_dir):
        pytest.skip("fixtures directory is empty or does not exist. Skipping integration test.")

    for filename in os.listdir(fixtures_dir):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            file_path = os.path.join(fixtures_dir, filename)
            mime_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"

            with open(file_path, "rb") as f:
                img_bytes = f.read()

            result = extract_receipt_data(img_bytes, mime_type=mime_type)

            # General structural assertions as defined in the playbook
            assert isinstance(result, ExtractedData)
            assert len(result.merchant) > 0
            assert result.total_amount > 0
            assert 0.0 <= result.confidence_score <= 1.0

            # Date must be YYYY-MM-DD (length 10, contains dashes)
            assert len(result.date) == 10
            assert "-" in result.date
