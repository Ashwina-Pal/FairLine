# Product Requirements Document: Fairline (MVP)

**Objective:** Build a functional end-to-end prototype that proves AI can accurately triage expense claims, auto-clearing the mundane and packaging the complex for human review.

### 1. Core Features (Compressed Sprint Scope)
To deliver a working demo by the deadline, we will build exactly five components:
*   **Simple Submit UI:** A single-page web form for employees to input claim details (Amount, Category, Date) and upload one receipt image.
*   **Vision-Language Agent (The Custom Agent):** A backend function using Gemini 1.5 Flash to parse the uploaded image into a strict JSON schema.
*   **Hardcoded Policy Engine (The Custom Skill):** A deterministic Python rules function that evaluates the structured JSON against 3 predefined rules.
*   **Approver Triage Dashboard:** A web view for finance showing a queue of flagged claims, displaying the receipt image side-by-side with the agent's "Evidence Packet."
*   **Basic Audit Trail:** A chronological log attached to each claim showing state changes and the specific rule that triggered any escalation.

---

### 2. User Stories & Acceptance Criteria

**Story 1: The Auto-Clear Path (Clean Claim)**
As an employee, I want my low-value, compliant expenses to be approved instantly without bothering my manager.
*   **AC 1:** Given a user uploads a legible receipt for a $15 meal, when the system extracts the data, it matches the user's manual input.
*   **AC 2:** Given the extracted data, when it is evaluated against the policy engine, it triggers no violations (e.g., under the $50 meal limit).
*   **AC 3:** Then the claim status instantly updates to "Auto-Approved" and is recorded in the audit log without entering the human review queue.

**Story 2: The Escalation Path (Policy Violation / Discrepancy)**
As the system, I want to flag claims that break the rules or lack clarity so a human can make the final judgment.
*   **AC 1:** Given a user submits a $200 software subscription claim with a missing or blurry receipt, when the agent attempts extraction, it detects a missing data field or low confidence.
*   **AC 2:** When the policy engine evaluates the data, it triggers the rule: "Missing receipt for claims > $50."
*   **AC 3:** Then the claim status changes to "Pending Review" (Escalated) and is routed to the Approver Dashboard.

**Story 3: Human-in-the-Loop Resolution**
As a finance approver, I want to see exactly why a claim was flagged so I can make a one-click decision.
*   **AC 1:** Given a pending claim, when the approver opens it, they see the uploaded receipt next to the agent's "Evidence Packet" (e.g., *Flagged: Amount claimed is $100, but receipt total is $85*).
*   **AC 2:** When the approver clicks "Approve" or "Reject", the claim's status updates accordingly.
*   **AC 3:** The approver's final decision and timestamp are appended to the claim's audit log.

**Story 4: Audit Traceability**
As a system auditor (or hackathon judge), I want to see the decision history of a claim so I can trust the system's logic.
*   **AC 1:** Every claim detail view must display a timeline log (e.g., *Submitted -> AI Extracted -> Flagged by Rule -> Approved/Rejected*).

---

### 3. Explicitly Out of Scope (Do Not Build)
*   **User Authentication/SSO:** Use hardcoded view toggles or separate URLs.
*   **Dynamic Rule Builder:** Hardcode the Python if/else rule checks.
*   **ERP/Accounting Integrations:** Mock the final payout step.
*   **Complex File Handling:** Support basic image uploads (JPEG/PNG) only.
*   **Mobile App:** Responsive web app only.