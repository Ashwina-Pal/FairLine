import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import ExtractedData, EvidencePacket

client = TestClient(app)

@patch("backend.routes.claims.get_firestore_client")
def test_create_claim_auto_approved(mock_get_db):
    """Submitting a compliant claim triggers AUTO_APPROVED status."""
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    
    mock_claim_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_claim_ref
    
    # Setup mock return for claim retrieve
    mock_claim_ref.get.return_value.to_dict.return_value = {
        "claim_id": "test-claim-uuid",
        "status": "AUTO_APPROVED",
        "manual_inputs": {
            "amount": 25.00,
            "category": "Supplies",
            "date": "2026-08-07",
            "cost_center": "ENG"
        },
        "receipt_image_url": None,
        "extracted_data": {
            "merchant": "Suppliers",
            "total_amount": 25.00,
            "date": "2026-08-07",
            "confidence_score": 0.90
        },
        "evidence_packet": {
            "is_escalated": False,
            "flagged_rule_ids": [],
            "explanation": "Claim cleared policy checks."
        }
    }
    
    # Mocking Gemini extraction
    with patch("backend.routes.claims.extract_receipt_data") as mock_extract:
        mock_extract.return_value = ExtractedData(
            merchant="Suppliers",
            total_amount=25.00,
            date="2026-08-07",
            confidence_score=0.90
        )
        
        # Submit a claim with no receipt image (will skip image upload but run skill)
        response = client.post(
            "/claims",
            data={
                "amount": 25.00,
                "category": "Supplies",
                "date": "2026-08-07",
                "cost_center": "ENG"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "AUTO_APPROVED"
        assert data["evidence_packet"]["is_escalated"] is False

@patch("backend.routes.claims.get_firestore_client")
def test_create_claim_escalated_discrepancy(mock_get_db):
    """Submitting a claim with amount mismatch escalates it."""
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    
    mock_claim_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_claim_ref
    
    mock_claim_ref.get.return_value.to_dict.return_value = {
        "claim_id": "test-claim-uuid",
        "status": "ESCALATED",
        "manual_inputs": {"amount": 100.00, "category": "Meals", "date": "2026-08-07", "cost_center": "HR"},
        "extracted_data": {"merchant": "Steakhouse", "total_amount": 80.00, "date": "2026-08-07", "confidence_score": 0.95},
        "evidence_packet": {
            "is_escalated": True,
            "flagged_rule_ids": ["AMOUNT_MISMATCH"],
            "explanation": "Amount claimed is $100.00 but receipt total is $80.00."
        }
    }
    
    with patch("backend.routes.claims.extract_receipt_data") as mock_extract:
        mock_extract.return_value = ExtractedData(
            merchant="Steakhouse",
            total_amount=80.00,
            date="2026-08-07",
            confidence_score=0.95
        )
        
        # Submit with a dummy image file parameter (triggers extraction agent)
        response = client.post(
            "/claims",
            data={
                "amount": 100.00,
                "category": "Meals",
                "date": "2026-08-07",
                "cost_center": "HR"
            },
            files={"receipt_image": ("receipt.jpg", b"fake_jpeg_content", "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ESCALATED"
        assert "AMOUNT_MISMATCH" in data["evidence_packet"]["flagged_rule_ids"]

@patch("backend.routes.claims.get_firestore_client")
def test_get_claim_details_with_logs(mock_get_db):
    """Retrieving a claim should return its fields alongside chronological audit logs."""
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    
    mock_claim_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_claim_ref
    
    # Mocking claim document
    mock_claim_doc = MagicMock()
    mock_claim_doc.exists = True
    mock_claim_doc.to_dict.return_value = {"claim_id": "123", "status": "ESCALATED"}
    mock_claim_ref.get.return_value = mock_claim_doc
    
    # Mocking sub-collection logs query stream
    mock_log_doc1 = MagicMock()
    mock_log_doc1.to_dict.return_value = {"log_id": "log-1", "timestamp": "2026-08-08T00:00:00Z", "actor": "EMPLOYEE"}
    mock_log_doc2 = MagicMock()
    mock_log_doc2.to_dict.return_value = {"log_id": "log-2", "timestamp": "2026-08-08T00:00:05Z", "actor": "CUSTOM_AGENT"}
    
    # Query ordering mock
    mock_query = mock_claim_ref.collection.return_value.order_by.return_value
    mock_query.stream.return_value = [mock_log_doc1, mock_log_doc2]
    
    response = client.get("/claims/123")
    
    assert response.status_code == 200
    data = response.json()
    assert data["claim_id"] == "123"
    assert len(data["audit_logs"]) == 2
    assert data["audit_logs"][0]["actor"] == "EMPLOYEE"
    assert data["audit_logs"][1]["actor"] == "CUSTOM_AGENT"

@patch("backend.routes.claims.get_firestore_client")
def test_list_escalated_claims(mock_get_db):
    """Listing escalated claims should query Firestore using correct filter status."""
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    
    mock_query = mock_db.collection.return_value.where.return_value
    mock_doc1 = MagicMock()
    mock_doc1.to_dict.return_value = {"claim_id": "1", "status": "ESCALATED"}
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {"claim_id": "2", "status": "ESCALATED"}
    mock_query.stream.return_value = [mock_doc1, mock_doc2]
    
    response = client.get("/claims/escalated")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["status"] == "ESCALATED"
    assert data[1]["status"] == "ESCALATED"

@patch("backend.routes.claims.get_firestore_client")
def test_record_approver_decision_approve(mock_get_db):
    """Approver approving an escalated claim updates status and writes audit log."""
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    
    mock_claim_ref = MagicMock()
    mock_db.collection.return_value.document.return_value = mock_claim_ref
    
    mock_claim_doc = MagicMock()
    mock_claim_doc.exists = True
    mock_claim_doc.to_dict.return_value = {"claim_id": "123", "status": "ESCALATED"}
    mock_claim_ref.get.return_value = mock_claim_doc
    
    response = client.post("/claims/123/decision", json={"decision": "APPROVE"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "MANUAL_APPROVED"
    
    # Assert status update was written to Firestore
    mock_claim_ref.update.assert_called_once_with({"status": "MANUAL_APPROVED"})
    # Assert log document was created in sub-collection
    mock_claim_ref.collection.return_value.document.return_value.set.assert_called_once()
