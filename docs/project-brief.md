# Project Brief: Fairline

**Track:** Business Process Automation
**Concept:** Agent-Driven Expense & Discrepancy Resolution System

## Problem Statement

Organizations suffer from inefficient, manual processing of employee expense claims. Currently, every claim—regardless of value or risk—receives the same level of manual scrutiny. This creates a dual bottleneck: finance teams waste cycles reviewing clean, low-value claims (like a $12 lunch receipt), while reviewer fatigue allows high-risk or undocumented claims to slip through unnoticed. Fairline solves this by triaging claims intelligently—automating the repetitive extraction and policy validation, and reserving human judgment solely for nuanced exceptions.

## Target Users

*   **Primary Persona (The Submitter):** Employees who need a frictionless way to upload receipts and log expenses without wrestling with complex forms. 
*   **Secondary Persona (The Approver):** Finance or Operations team members. They need a dashboard that surfaces only flagged claims, accompanied by a clear "evidence packet" explaining exactly which policy was breached, enabling rapid, informed decision-making.

## Core Workflow

1. **Intake:** The employee submits a claim via a lightweight frontend. Inputs include the requested amount, category, date, cost center, and a receipt attachment (image or PDF).
2. **Extraction:** An AI agent parses the unstructured receipt attachment to extract structured key-value pairs (merchant, date, total amount, taxes) to cross-reference against the user's manual inputs.
3. **Policy Check:** The structured data is evaluated against a predefined rules engine. Checks include spending limits per category, required documentation thresholds, duplicate detection, and submission deadlines.
4. **Decision Gate:** Claims that pass all policy checks are automatically cleared for payment. Any claim that triggers a rule violation is paused, flagged, and packaged with an "evidence packet" detailing the specific discrepancy.
5. **Human Review:** The escalated claim appears in the Approver dashboard. The human reviews the agent's evidence packet and makes the final binary decision: Approve or Reject.
6. **Audit Logging:** Every state change is recorded immutably. The log captures the claim's origin, the agent's extraction confidence, the specific rules evaluated, the routing decision, and the final human action (with timestamps).

## Success Criteria

To win the Business Process Automation track, Fairline must demonstrate:
*   **Agent Accuracy:** High fidelity in extracting structured data from messy, real-world receipt images.
*   **Effective Triage:** Clear demonstration of a clean claim auto-clearing versus a non-compliant claim successfully escalating.
*   **Human-Centric UX:** The approver dashboard must drastically reduce cognitive load by highlighting *why* a claim was flagged, rather than making the human dig through the receipt.
*   **Traceability:** A transparent, easily readable audit log proving that the system's decisions are explainable and secure.

## Scope Boundaries (Compressed Timeline)

| Feature Category | In-Scope (The 1-Day Build Sprint) | Out-of-Scope (Future Roadmap) |
| :--- | :--- | :--- |
| **Frontend/UI** | Two simple views: a submission form for employees and an approval queue for finance. | Mobile app development, SSO/SAML integration, complex user role hierarchies. |
| **Backend & Data** | Lightweight FastAPI backend with Firebase Firestore and Storage. | Integration with enterprise ERPs (SAP, Oracle, Workday). |
| **Agent / Extraction** | Gemini 1.5 Flash Vision API integration to parse 3-5 sample receipts. | Handling handwritten, heavily damaged, or multi-page, multi-currency invoices. |
| **Policy Engine** | 3 hardcoded business rules (Amount mismatch, missing receipts for meals > 50, low confidence). | Dynamic rule-builder UI for administrators. |
| **Audit Trail** | Chronological audit log sub-collection attached to each claim. | Cryptographically signed logs or compliance exports (SOC2). |