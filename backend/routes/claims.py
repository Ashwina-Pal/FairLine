import uuid
import json
import os
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from firebase_admin import firestore, storage
from backend.firebase import get_firestore_client
from backend.models import Claim, ManualInput, ExtractedData, EvidencePacket, AuditLog
from backend.agents.receipt_extraction_agent import extract_receipt_data
from backend.skills.policy_validation_skill import evaluate_policy

router = APIRouter(prefix="/claims", tags=["claims"])

@router.post("")
async def create_claim(
    amount: float = Form(..., description="Userclaimed amount"),
    category: str = Form(..., description="Expense category (Meals, Travel, Supplies, etc.)"),
    date: str = Form(..., description="Transaction date (YYYY-MM-DD)"),
    cost_center: str = Form(..., description="Cost center department code"),
    receipt_image: Optional[UploadFile] = File(None, description="Receipt image file upload (PNG/JPG)")
):
    """
    Submits a claim. Triggers receipt extraction, policy validation rules,
    and updates the status to AUTO_APPROVED or ESCALATED with an evidence packet.
    """
    db = get_firestore_client()
    claim_id = str(uuid.uuid4())
    
    # 1. Gather manual input fields
    manual_input = ManualInput(
        amount=amount,
        category=category,
        date=date,
        cost_center=cost_center
    )
    
    # 2. Build the PENDING claim document structure
    claim_data = {
        "claim_id": claim_id,
        "status": "PENDING",
        "manual_inputs": manual_input.model_dump(),
        "receipt_image_url": None,
        "extracted_data": None,
        "evidence_packet": None
    }
    
    claim_ref = db.collection("claims").document(claim_id)
    claim_ref.set(claim_data)
    
    # Helper to write sub-collection audit logs in Firestore
    # Ensures all state changes are logged to the audit_logs sub-collection - no silent transitions
    def write_audit_log(actor: str, action: str, details: Optional[dict] = None):
        log_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"
        log_ref = claim_ref.collection("audit_logs").document(log_id)
        log_ref.set({
            "log_id": log_id,
            "timestamp": timestamp,
            "actor": actor,
            "action": action,
            "details": json.dumps(details) if details else None
        })
        
    # Log the initial employee submission
    write_audit_log(
        actor="EMPLOYEE",
        action="submitted",
        details=manual_input.model_dump()
    )
    
    receipt_image_url = None
    extracted_data = None
    
    # 3. Process the file upload & receipt extraction if an image is provided
    if receipt_image:
        try:
            image_bytes = await receipt_image.read()
            await receipt_image.seek(0)  # Reset pointer
            
            extension = os.path.splitext(receipt_image.filename)[1] or ".jpg"
            if extension.lower() not in [".jpg", ".jpeg", ".png"]:
                raise HTTPException(status_code=400, detail="Invalid file type. Only JPG/JPEG/PNG supported.")
            
            content_type = receipt_image.content_type or "image/jpeg"
            
            # Try uploading to Firebase Storage
            bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
            if bucket_name:
                try:
                    bucket = storage.bucket()
                    blob = bucket.blob(f"receipts/{claim_id}{extension}")
                    blob.upload_from_string(image_bytes, content_type=content_type)
                    # Generate 7-day signed link
                    receipt_image_url = blob.generate_signed_url(expiration=604800)
                except Exception as storage_err:
                    print(f"Firebase Storage upload failed: {storage_err}. Falling back to local static serve.")
                    receipt_image_url = None
            
            # Local fallback upload folder if storage is not set up
            if not receipt_image_url:
                local_dir = "backend/static/uploads"
                os.makedirs(local_dir, exist_ok=True)
                local_path = os.path.join(local_dir, f"{claim_id}{extension}")
                with open(local_path, "wb") as f:
                    f.write(image_bytes)
                receipt_image_url = f"/static/uploads/{claim_id}{extension}"
                
            claim_ref.update({"receipt_image_url": receipt_image_url})
            
            # Trigger custom extraction agent using Gemini
            # Comment annotation: Designated "Custom Agent" (Agent Rules #5)
            extracted_data = extract_receipt_data(image_bytes, mime_type=content_type)
            claim_ref.update({"extracted_data": extracted_data.model_dump()})
            
            write_audit_log(
                actor="CUSTOM_AGENT",
                action="extracted",
                details=extracted_data.model_dump()
            )
            
        except Exception as e:
            print(f"Receipt extraction failed: {e}. Defaulting metadata values.")
            extracted_data = ExtractedData(
                merchant="Extraction Failed",
                total_amount=0.0,
                date="N/A",
                confidence_score=0.0
            )
            claim_ref.update({"extracted_data": extracted_data.model_dump()})
            write_audit_log(
                actor="CUSTOM_AGENT",
                action="extraction_failed",
                details={"error": str(e)}
            )
    else:
        # Default empty extraction metadata if no file was uploaded
        extracted_data = ExtractedData(
            merchant="N/A",
            total_amount=0.0,
            date="N/A",
            confidence_score=0.0
        )
        claim_ref.update({"extracted_data": extracted_data.model_dump()})

    # 4. Enforce Policy checks
    # Comment annotation: Designated "Custom Skill" (Agent Rules #6)
    # Never bypass the Policy Validation Skill — every claim must pass through the rules engine (Agent Rules #1)
    evidence_packet = evaluate_policy(manual_input, extracted_data, receipt_image_url)
    claim_ref.update({"evidence_packet": evidence_packet.model_dump()})
    
    write_audit_log(
        actor="CUSTOM_SKILL",
        action="policy_checked",
        details=evidence_packet.model_dump()
    )
    
    # 5. Routing Triage Decision Gate
    # Never auto-approve a claim without running all 3 rules (Agent Rules #3)
    if not evidence_packet.is_escalated:
        status = "AUTO_APPROVED"
        claim_ref.update({"status": status})
        write_audit_log(
            actor="CUSTOM_SKILL",
            action="auto-cleared"
        )
    else:
        status = "ESCALATED"
        claim_ref.update({"status": status})
        write_audit_log(
            actor="CUSTOM_SKILL",
            action="flagged",
            details={"flagged_rule_ids": evidence_packet.flagged_rule_ids}
        )
        
    final_doc = claim_ref.get()
    return final_doc.to_dict()

@router.get("/escalated")
def list_escalated_claims():
    """Retrieves all claims flagged as ESCALATED for the Approver dashboard queue."""
    db = get_firestore_client()
    claims_ref = db.collection("claims").where("status", "==", "ESCALATED")
    docs = claims_ref.stream()
    
    escalated_claims = []
    for doc in docs:
        escalated_claims.append(doc.to_dict())
        
    return escalated_claims

@router.get("/{claim_id}")
def get_claim_details(claim_id: str):
    """Retrieves claim details along with its full chronologically ordered audit logs."""
    db = get_firestore_client()
    claim_ref = db.collection("claims").document(claim_id)
    claim_doc = claim_ref.get()
    
    if not claim_doc.exists:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    claim_data = claim_doc.to_dict()
    
    # Read sub-collection audit logs chronologically
    logs_ref = claim_ref.collection("audit_logs").order_by("timestamp", direction=firestore.Query.ASCENDING)
    logs = logs_ref.stream()
    
    audit_logs = []
    for log in logs:
        audit_logs.append(log.to_dict())
        
    claim_data["audit_logs"] = audit_logs
    return claim_data

@router.post("/{claim_id}/decision")
def record_approver_decision(claim_id: str, payload: dict):
    """Handles approver manual approve/reject decisions."""
    decision = payload.get("decision")
    if decision not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Invalid decision. Must be APPROVE or REJECT.")
        
    db = get_firestore_client()
    claim_ref = db.collection("claims").document(claim_id)
    claim_doc = claim_ref.get()
    
    if not claim_doc.exists:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    claim_data = claim_doc.to_dict()
    if claim_data.get("status") != "ESCALATED":
        raise HTTPException(status_code=400, detail="Only escalated claims can be decisioned.")
        
    new_status = "MANUAL_APPROVED" if decision == "APPROVE" else "MANUAL_REJECTED"
    claim_ref.update({"status": new_status})
    
    # Log Approver manual decision
    log_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"
    log_ref = claim_ref.collection("audit_logs").document(log_id)
    log_ref.set({
        "log_id": log_id,
        "timestamp": timestamp,
        "actor": "APPROVER",
        "action": decision.lower() + "d",
        "details": json.dumps({"decision": decision})
    })
    
    return {"claim_id": claim_id, "status": new_status}
