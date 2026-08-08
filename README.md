# FairLine

An intelligent, agent-driven expense and reimbursement discrepancy resolver. Ingests submitted expenses and receipts, checks them against deterministic policy rules, auto-clears clean claims, and routes exceptions to a human approver with a full evidence packet and audit trail.

🔗 **GitHub Repository:** [https://github.com/Ashwina-Pal/FairLine](https://github.com/Ashwina-Pal/FairLine)

---

## 📸 User Interface Screenshots

### 1. Submit Expense Claim UI
The employee submission interface allowing users to upload a receipt and manually input expense details.
![Submit Expense Claim](docs/submit_claim.png)

### 2. Approver Triage Queue Dashboard
The manager review interface displaying the list of escalated claims requiring review.
![Approver Triage Queue](docs/approver_dashboard.png)

---

## 🚀 Key Features

*   **Custom Agent (Receipt Extraction):** Multimodal extraction powered by Gemini 1.5 Flash to parse unstructured receipt images into structured JSON schemas.
*   **Custom Skill (Policy Validation Engine):** A deterministic Python rules engine that evaluates structured claims against business rules to generate an `EvidencePacket`.
*   **Approver Triage Dashboard:** Side-by-side comparison of manual claims, extracted data, and flagged policy violations.
*   **State Audit Trail:** Complete historical logs of system/user actions and claim status transitions.

---

## 📋 Hardcoded Policy Rules

The Policy Validation engine enforces the following core rules:
1.  **Rule 1 (Amount Mismatch):** Flagged as `AMOUNT_MISMATCH` if the user-entered amount doesn't match the receipt's total amount.
2.  **Rule 2 (Missing Documentation):** Flagged as `MISSING_DOCUMENTATION` if a claim under the "Meals" category exceeds $50 and has no uploaded receipt image.
3.  **Rule 3 (Low Confidence):** Flagged as `LOW_CONFIDENCE_EXTRACTION` if the agent's extraction confidence score is below 85%.

---

## ⚙️ Getting Started & Cloning Steps

To clone, set up, and run the project locally, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/Ashwina-Pal/FairLine.git
cd FairLine
```

### 2. Backend Setup
1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate
   ```
2. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up your `.env` configuration (make a copy of `.env.example` and add your `GEMINI_API_KEY` and Firebase path credentials).
4. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser at `http://localhost:3000`.

---

## 📂 Documentation

*   [Project Brief](docs/project-brief.md) - Project overview, target personas, and scope.
*   [Product Requirements Document (PRD)](docs/prd.md) - Features, user stories, and acceptance criteria.
*   [Architecture & Data Model](docs/architecture.md) - Technical specifications, Firestore schemas, and engine rules.
*   [Agents & Skills Specification](AGENTS_AND_SKILLS.md) - Detailed contracts, Pydantic schemas, policy rules, and constraints for the Custom Agent and Skill.
