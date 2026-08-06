# Architecture Document: Fairline

## 1. Recommended Tech Stack

Optimized for a single-day build sprint, prioritizing zero-configuration and strict data contracts:

| Layer | Technology | Why for this MVP? |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (React) + Tailwind CSS** | Fast scaffolding for Submitter and Approver views. Instant Vercel deployment. |
| **Backend** | **FastAPI (Python)** | Industry standard for AI backends. Native `async/await` prevents blocking during LLM calls. |
| **Data Validation** | **Pydantic** | Enforces strict JSON schemas from the LLM, eliminating brittle string parsing. |
| **Agent / LLM** | **Gemini 1.5 Flash (Vision)** | Massive speed advantage and robust multimodal capabilities for receipt parsing. |
| **Database & Storage** | **Firebase (Firestore & Cloud Storage)** | Fast NoSQL document syncing and seamless receipt image file uploads. |
| **Quality & CI** | **GitHub Actions, Playwright, Ruff, ESLint** | Automated testing, linting, and green CI status from commit zero. |

---

## 2. Core Definitions (Hackathon Compliance)

*   **Custom Agent (The Receipt Extraction Agent):** A multimodal AI agent powered by Gemini 1.5 Flash that takes an unstructured image and a prompt, orchestrating the extraction of data into a strict Pydantic JSON schema.
*   **Custom Skill (The Policy Validation Skill):** A deterministic Python rules engine acting as a skill for the system. It ingests the agent's structured JSON output, cross-references it with business rules, and flags discrepancies to generate an `EvidencePacket`.

---

## 3. Data Model (Firestore)

### Collection: `claims`
*   `claim_id` (String, UUID)
*   `status` (Enum: `PENDING`, `AUTO_APPROVED`, `ESCALATED`, `MANUAL_APPROVED`, `MANUAL_REJECTED`)
*   `manual_inputs`: Object (amount, category, date, cost_center)
*   `receipt_image_url` (String, Firebase Storage link)
*   `extracted_data`: Object (merchant, total_amount, date, confidence_score) — *Populated by Agent*
*   `evidence_packet`: Object (flagged_rule_id, explanation) — *Populated by Skill*

### Collection: `audit_logs` (Sub-collection under `claims`)
*   `log_id` (String, UUID)
*   `timestamp` (ISO 8601 String)
*   `actor` (Enum: `EMPLOYEE`, `CUSTOM_AGENT`, `CUSTOM_SKILL`, `APPROVER`)
*   `action` (String)
*   `details` (String, JSON payload)

---

## 4. Hardcoded Policy Rules (The Custom Skill Logic)
1.  **Rule 1 (Amount Mismatch):** If `manual_inputs.amount` != `extracted_data.total_amount`, flag as `AMOUNT_MISMATCH`.
2.  **Rule 2 (Missing Documentation):** If `category` == "Meals" AND `amount` > 50 AND `receipt_image_url` is null, flag as `MISSING_DOCUMENTATION`.
3.  **Rule 3 (Low Confidence):** If `extracted_data.confidence_score` < 0.85, flag as `LOW_CONFIDENCE_EXTRACTION`.