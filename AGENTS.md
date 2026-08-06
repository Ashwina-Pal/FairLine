# Agent Rules — Fairline

These rules govern how AI coding agents (Cline) should behave while building this project.

1. Never bypass the Policy Validation Skill — every claim must pass through the rules engine before being marked AUTO_APPROVED or ESCALATED.
2. Always log state changes to the `audit_logs` sub-collection in Firestore — no state transition happens silently.
3. Never auto-approve a claim without running all 3 hardcoded policy rules (Amount Mismatch, Missing Documentation, Low Confidence Extraction).
4. Always use Gemini 1.5 Flash for multimodal/extraction tasks, and always force strict JSON output matching the Pydantic schema — no free-form text responses from the extraction step.
5. The Receipt Extraction step is the designated "Custom Agent" — label it clearly in code comments.
6. The Policy Validation rules engine is the designated "Custom Skill" — label it clearly in code comments.
7. Commit after each completed task, not in one large end-of-session dump.