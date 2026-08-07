from backend.models import ExtractedData, ManualInput
from backend.skills.policy_validation_skill import evaluate_policy


def test_clean_claim():
    """A claim that meets all policy rules should not be escalated."""
    manual = ManualInput(amount=15.00, category="Meals", date="2026-08-07", cost_center="ENG")
    extracted = ExtractedData(merchant="Local Deli", total_amount=15.00, date="2026-08-07", confidence_score=0.95)

    result = evaluate_policy(manual, extracted, receipt_image_url="http://storage.example.com/receipt.jpg")

    assert result.is_escalated is False
    assert len(result.flagged_rule_ids) == 0
    assert "cleared policy checks" in result.explanation


def test_amount_mismatch():
    """A claim with different manual and extracted amounts should trigger AMOUNT_MISMATCH."""
    manual = ManualInput(amount=45.00, category="Supplies", date="2026-08-07", cost_center="ENG")
    extracted = ExtractedData(merchant="OfficeMax", total_amount=40.00, date="2026-08-07", confidence_score=0.90)

    result = evaluate_policy(manual, extracted, receipt_image_url="http://storage.example.com/receipt.jpg")

    assert result.is_escalated is True
    assert "AMOUNT_MISMATCH" in result.flagged_rule_ids
    assert "Amount claimed is $45.00 but receipt total is $40.00" in result.explanation


def test_amount_mismatch_precision_rounding():
    """Amounts differing by minor fractions should be rounded to 2 decimals before comparison."""
    # Differing by less than half a cent -> should round to the same amount and pass
    manual = ManualInput(amount=10.004, category="Travel", date="2026-08-07", cost_center="MKT")
    extracted = ExtractedData(merchant="Bus", total_amount=10.00, date="2026-08-07", confidence_score=0.99)
    result = evaluate_policy(manual, extracted, receipt_image_url="http://storage.example.com/receipt.jpg")
    assert result.is_escalated is False

    # Differing by exactly or more than half a cent -> should round to different amounts and fail
    manual_fail = ManualInput(amount=10.005, category="Travel", date="2026-08-07", cost_center="MKT")
    result_fail = evaluate_policy(manual_fail, extracted, receipt_image_url="http://storage.example.com/receipt.jpg")
    assert result_fail.is_escalated is True
    assert "AMOUNT_MISMATCH" in result_fail.flagged_rule_ids


def test_missing_documentation_boundary_checks():
    """Verifies rule boundaries for Category: Meals and Amount > $50."""
    extracted = ExtractedData(merchant="Diner", total_amount=50.00, date="2026-08-07", confidence_score=0.90)

    # 1. Meals category at EXACTLY $50.00 with no image -> should PASS (rule checks amount > 50)
    manual_exactly_50 = ManualInput(amount=50.00, category="Meals", date="2026-08-07", cost_center="HR")
    result_exactly_50 = evaluate_policy(manual_exactly_50, extracted, receipt_image_url=None)
    assert "MISSING_DOCUMENTATION" not in result_exactly_50.flagged_rule_ids
    assert result_exactly_50.is_escalated is False

    # 2. Meals category at $50.01 with no image -> should FAIL
    manual_just_above_50 = ManualInput(amount=50.01, category="Meals", date="2026-08-07", cost_center="HR")
    # extracted total needs to match manual so we don't trigger amount mismatch
    extracted_just_above = ExtractedData(merchant="Diner", total_amount=50.01, date="2026-08-07", confidence_score=0.90)
    result_just_above_50 = evaluate_policy(manual_just_above_50, extracted_just_above, receipt_image_url=None)
    assert "MISSING_DOCUMENTATION" in result_just_above_50.flagged_rule_ids
    assert result_just_above_50.is_escalated is True

    # 3. Non-Meals category (e.g. Travel) at $100.00 with no image
    # -> should PASS (documentation only enforced for Meals)
    manual_travel = ManualInput(amount=100.00, category="Travel", date="2026-08-07", cost_center="OPS")
    extracted_travel = ExtractedData(merchant="Flight", total_amount=100.00, date="2026-08-07", confidence_score=0.90)
    result_travel = evaluate_policy(manual_travel, extracted_travel, receipt_image_url=None)
    assert "MISSING_DOCUMENTATION" not in result_travel.flagged_rule_ids


def test_low_confidence_boundary_checks():
    """Verifies confidence score boundaries at the 0.85 threshold."""
    manual = ManualInput(amount=30.00, category="Supplies", date="2026-08-07", cost_center="ENG")

    # 1. Confidence exactly at 0.85 -> should PASS (rule checks confidence < 0.85)
    extracted_exact = ExtractedData(merchant="Store", total_amount=30.00, date="2026-08-07", confidence_score=0.85)
    result_exact = evaluate_policy(manual, extracted_exact, receipt_image_url="http://storage.example.com/receipt.jpg")
    assert "LOW_CONFIDENCE_EXTRACTION" not in result_exact.flagged_rule_ids
    assert result_exact.is_escalated is False

    # 2. Confidence at 0.84 -> should FAIL
    extracted_below = ExtractedData(merchant="Store", total_amount=30.00, date="2026-08-07", confidence_score=0.84)
    result_below = evaluate_policy(manual, extracted_below, receipt_image_url="http://storage.example.com/receipt.jpg")
    assert "LOW_CONFIDENCE_EXTRACTION" in result_below.flagged_rule_ids
    assert result_below.is_escalated is True


def test_multiple_rule_violations():
    """Multiple policy violations should all be returned together, without short-circuiting."""
    manual = ManualInput(amount=120.00, category="Meals", date="2026-08-07", cost_center="ENG")
    extracted = ExtractedData(merchant="Steakhouse", total_amount=100.00, date="2026-08-07", confidence_score=0.70)

    # Triggers:
    # 1. Amount mismatch (120 vs 100)
    # 2. Missing documentation (Meals > 50, receipt_image_url is None)
    # 3. Low confidence (0.70 < 0.85)
    result = evaluate_policy(manual, extracted, receipt_image_url=None)

    assert result.is_escalated is True
    assert "AMOUNT_MISMATCH" in result.flagged_rule_ids
    assert "MISSING_DOCUMENTATION" in result.flagged_rule_ids
    assert "LOW_CONFIDENCE_EXTRACTION" in result.flagged_rule_ids
    assert len(result.flagged_rule_ids) == 3
    assert "Amount claimed is $120.00" in result.explanation
    assert "Missing receipt" in result.explanation
    assert "extraction confidence score (0.70)" in result.explanation
