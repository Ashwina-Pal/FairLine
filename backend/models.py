from pydantic import BaseModel, Field
from typing import Optional, List

class ManualInput(BaseModel):
    amount: float = Field(..., description="The user-entered amount of the claim")
    category: str = Field(..., description="The category of the expense (e.g. Meals, Travel, Supplies)")
    date: str = Field(..., description="The date of the expense (YYYY-MM-DD)")
    cost_center: str = Field(..., description="The cost center for the expense")

class ExtractedData(BaseModel):
    merchant: str = Field(..., description="Extracted merchant name")
    total_amount: float = Field(..., description="Extracted total amount from receipt")
    date: str = Field(..., description="Extracted date from receipt (YYYY-MM-DD)")
    confidence_score: float = Field(..., description="AI extraction confidence score (0.0 to 1.0)")

class EvidencePacket(BaseModel):
    is_escalated: bool = Field(..., description="True if any validation rules failed")
    flagged_rule_ids: List[str] = Field(default_factory=list, description="IDs of rules that were triggered")
    explanation: str = Field(..., description="Consolidated human-readable explanation of rule violations")

class Claim(BaseModel):
    claim_id: str = Field(..., description="Unique UUID for the claim")
    status: str = Field(..., description="Status: PENDING, AUTO_APPROVED, ESCALATED, MANUAL_APPROVED, MANUAL_REJECTED")
    manual_inputs: ManualInput = Field(..., description="User manual entry data")
    receipt_image_url: Optional[str] = Field(None, description="URL to the uploaded receipt image in Storage")
    extracted_data: Optional[ExtractedData] = Field(None, description="Structured data extracted by the agent")
    evidence_packet: Optional[EvidencePacket] = Field(None, description="Policy violations flagged by the skill")

class AuditLog(BaseModel):
    log_id: str = Field(..., description="Unique UUID for the log entry")
    timestamp: str = Field(..., description="ISO 8601 timestamp when the action occurred")
    actor: str = Field(..., description="Actor: EMPLOYEE, CUSTOM_AGENT, CUSTOM_SKILL, APPROVER")
    action: str = Field(..., description="The action performed (e.g., submitted, auto-cleared)")
    details: Optional[str] = Field(None, description="Stringified JSON payload with extra details")