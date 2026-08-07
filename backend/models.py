from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ManualInput(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    text: str

class ExtractedData(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    text: str
    receipt_image_url: Optional[str]

class EvidencePacket(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    text: str
    extracted_data: Optional[str]

class Claim(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    text: str

class AuditLog(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    event: str
    description: str