# ==========================================
# CUSTOM SKILL: Policy Validation Skill
# ==========================================
# This is the designated "Custom Skill" for the FairLine expense system.
# It is a deterministic Python rules engine that evaluates structured
# claim data and manual inputs against corporate expense policy rules.
# It evaluates all rules without short-circuiting to provide a complete
# explanation packet for human approvers.
# ==========================================

from typing import Optional
from backend.models import ManualInput, ExtractedData, EvidencePacket

def evaluate_policy(
    manual_input: ManualInput,
    extracted_data: ExtractedData,
    receipt_image_url: Optional[str] = None
) -> EvidencePacket:
    """
    Evaluates manual inputs and extracted receipt data against policy rules.
    Runs all 3 hardcoded policy checks and returns a consolidated EvidencePacket.
    Does NOT short-circuit so all rule violations are gathered.
    """
    is_escalated = False
    flagged_rule_ids = []
    explanations = []

    # Rule 1 (Amount Mismatch): Compare user claimed amount with receipt total
    # We round to 2 decimal places to avoid floating point precision mismatch
    if round(manual_input.amount, 2) != round(extracted_data.total_amount, 2):
        is_escalated = True
        flagged_rule_ids.append("AMOUNT_MISMATCH")
        explanations.append(
            f"Amount claimed is ${manual_input.amount:.2f} but receipt total is ${extracted_data.total_amount:.2f}."
        )

    # Rule 2 (Missing Documentation): Category Meals > $50 requires a receipt image
    if manual_input.category == "Meals" and manual_input.amount > 50.0 and not receipt_image_url:
        is_escalated = True
        flagged_rule_ids.append("MISSING_DOCUMENTATION")
        explanations.append("Missing receipt for category 'Meals' and amount exceeds $50.00.")

    # Rule 3 (Low Confidence): AI extraction confidence is below 85%
    if extracted_data.confidence_score < 0.85:
        is_escalated = True
        flagged_rule_ids.append("LOW_CONFIDENCE_EXTRACTION")
        explanations.append(
            f"AI extraction confidence score ({extracted_data.confidence_score:.2f}) is below the threshold of 0.85."
        )

    if not is_escalated:
        return EvidencePacket(
            is_escalated=False,
            flagged_rule_ids=[],
            explanation="Claim cleared policy checks."
        )

    return EvidencePacket(
        is_escalated=True,
        flagged_rule_ids=flagged_rule_ids,
        explanation="; ".join(explanations)
    )
