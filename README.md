# FairLine

An agent-driven expense and reimbursement discrepancy resolver. Ingests submitted expenses/receipts, checks them against policy rules, auto-clears clean claims, and routes exceptions to a human approver with a full evidence packet and audit trail.

## 🚀 Key Features

*   **Custom Agent (Receipt Extraction):** Multimodal extraction powered by Gemini 1.5 Flash to parse unstructured receipt images into structured JSON schemas.
*   **Custom Skill (Policy Validation Engine):** A deterministic Python rules engine that evaluates structured claims against business rules to generate an `EvidencePacket`.
*   **Approver Triage Dashboard:** Side-by-side comparison of manual claims, extracted data, and flagged policy violations.
*   **State Audit Trail:** Complete historical logs of system/user actions and claim status transitions.

## 📋 Hardcoded Policy Rules

The Policy Validation engine enforces the following core rules:
1.  **Rule 1 (Amount Mismatch):** Flagged as `AMOUNT_MISMATCH` if the user-entered amount doesn't match the receipt's total amount.
2.  **Rule 2 (Missing Documentation):** Flagged as `MISSING_DOCUMENTATION` if a claim under the "Meals" category exceeds $50 and has no uploaded receipt image.
3.  **Rule 3 (Low Confidence):** Flagged as `LOW_CONFIDENCE_EXTRACTION` if the agent's extraction confidence score is below 85%.

> [!NOTE]
> Other potential checks (such as duplicate detection and submission deadline rules) are designated as future roadmap stretch goals and are out of core scope for this sprint.

## 📂 Documentation

*   [Project Brief](file:///c:/FairLine/docs/project-brief.md) - Project overview, target personas, and scope.
*   [Product Requirements Document (PRD)](file:///c:/FairLine/docs/prd.md) - Features, user stories, and acceptance criteria.
*   [Architecture & Data Model](file:///c:/FairLine/docs/architecture.md) - Technical specifications, Firestore schemas, and engine rules.
*   [Agents & Skills Specification](file:///c:/FairLine/AGENTS_AND_SKILLS.md) - Detailed contracts, Pydantic schemas, policy rules, and constraints for the Custom Agent and Skill.
