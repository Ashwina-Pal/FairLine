# Fairline — Cline Build Guide (Start to Finish)

This is your step-by-step playbook for building Fairline using Cline. Each step has:
- **What to do manually** (setup, checking things)
- **Exact prompt to paste into Cline** where relevant
- **What to verify before moving on**

Rule of thumb: use **Plan mode** for anything structural (new files, architecture, schema), and **Act mode** only once you've read and agree with the plan. Never blind-approve.

---

## PHASE 0 — Project Setup (do this manually, not via Cline)

1. Create your project folder and initialize git:
```bash
mkdir fairline && cd fairline
git init
git remote add origin <your-empty-public-github-repo-url>
```

2. Create the folder structure:
```
fairline/
  backend/
  frontend/
  docs/
    project-brief.md
    prd.md
    architecture.md
  .github/workflows/
  AGENTS.md
  AGENTS_AND_SKILLS.md
```

3. Paste your four documents (Project Brief, Architecture, PRD, Agent Rules) into `docs/project-brief.md`, `docs/architecture.md`, `docs/prd.md`, and `AGENTS.md` respectively — **before you open Cline**. This is critical: Cline reads whatever's in your repo, so if these docs are in place first, every prompt below can just say "per docs/architecture.md" instead of you re-explaining things.

4. Commit this skeleton:
```bash
git add . && git commit -m "chore: project skeleton and docs"
```

5. Open the folder in VS Code, open Cline, confirm your API key is connected.

---

## PHASE 1 — Backend Scaffolding (FastAPI)

**Goal:** Get a running FastAPI server with Firestore wired up and Pydantic schemas defined, before touching any AI logic.

### Prompt 1.1 — Scaffold the backend
```
Read docs/architecture.md and docs/prd.md before doing anything.

Set up a FastAPI backend in /backend with this structure:
- backend/main.py (FastAPI app entrypoint with healthcheck endpoint placeholders)
- backend/models.py (Pydantic schemas for: ManualInput, ExtractedData, EvidencePacket, Claim, AuditLog — match the fields exactly as described in docs/architecture.md section 3, Data Model. Ensure models support dict-export or parsing from Firestore documents)
- backend/firebase.py (Firebase Admin SDK initialization, reading credentials from a local file or environment path via .env, never hardcoded)
- backend/requirements.txt (FastAPI, uvicorn, pydantic, firebase-admin, python-dotenv, google-genai)
- backend/.env.example (placeholder for FIREBASE_CREDENTIALS_PATH, GEMINI_API_KEY)

Do not implement any business logic yet — this step is scaffolding and schema definition only. Show me the plan before writing files.
```

**Verify:** Check that `models.py` actually matches your architecture doc's `claims` and `audit_logs` collections field-for-field. If Cline invented extra fields, tell it to remove them.

**Commit:** `git commit -m "feat: backend scaffold + pydantic schemas"`

### Prompt 1.2 — Firestore connection test
```
Add a simple GET /health endpoint in main.py that writes a test document to a Firestore collection called "healthcheck" and reads it back, returning {"status": "ok", "firestore": true/false}. This is just to confirm the Firebase connection works end to end before we build real features.
```

**Verify:** Run the server locally (`uvicorn backend.main:app --reload` from `backend` directory) and hit `/health` in your browser or via curl. Don't move on until this returns `true` for firestore.

---

## PHASE 2 — The Custom Agent (Receipt Extraction)

This is one of your two mandatory "custom agent + custom skill" checkpoint items — label it clearly, per your Agent Rules doc.

### Prompt 2.1 — Build the extraction agent
```
Per docs/architecture.md and AGENTS.md (Agent Rules), build the Receipt Extraction Agent — this is our designated "Custom Agent" for the hackathon checkpoint, so label it clearly with a comment block at the top of the file explaining that.

Create backend/agents/receipt_extraction_agent.py:
- A function extract_receipt_data(image_bytes: bytes) -> ExtractedData
- Use Gemini 1.5 Flash via the Google Gen AI SDK
- Force strict JSON output by passing the ExtractedData Pydantic schema to the Gemini Client config using the `response_schema` parameter (with response_mime_type="application/json") — this guarantees adherence to the schema and avoids manual retry logic.
- Include a well-engineered prompt to the model explaining how to analyze the receipt image and map the values to the fields (merchant, total_amount, date, confidence_score). Make sure it evaluates the confidence of its extraction natively.
- Read the GEMINI_API_KEY from .env

Show me the prompt you're sending to Gemini before finalizing — I want to review the wording.
```

**Verify:** Check the exact prompt sent to Gemini. Ensure `confidence_score` is self-reported by Gemini based on visual clarity (0.0 to 1.0) and not hardcoded to a static float value.

### Prompt 2.2 — Test with real sample receipts
```
Create backend/tests/test_receipt_extraction.py using pytest. I will provide 3-5 sample receipt images in backend/tests/fixtures/. Write tests that call extract_receipt_data() on each and assert the response matches the ExtractedData schema (types are correct, confidence_score is between 0 and 1, total_amount is a positive float). Do not assert exact extracted values since these are real images — just structural correctness.
```

**Action:** Actually drop 3-5 real receipt photos/screenshots into `backend/tests/fixtures/` before running this — the PRD explicitly commits to "3-5 sample receipts," so this is a scoring requirement, not optional polish.

**Commit:** `git commit -m "feat: custom agent - receipt extraction via Gemini Vision"`

---

## PHASE 3 — The Custom Skill (Policy Validation Engine)

Your second mandatory checkpoint item. This is deliberately **deterministic Python**, not AI — per your architecture doc.

### Prompt 3.1 — Build the policy engine
```
Per docs/architecture.md section 4 (Hardcoded Policy Rules) and AGENTS.md, build the Policy Validation Skill — this is our designated "Custom Skill." Label it clearly with a comment block explaining it's deterministic, not AI-based.

Create backend/skills/policy_validation_skill.py:
- A function evaluate_policy(manual_input: ManualInput, extracted_data: ExtractedData) -> EvidencePacket
- Do NOT short-circuit or stop at the first violation. Run all checks and collect ALL triggered rule violations to populate the EvidencePacket. This ensures that the human reviewer sees all issues and complies with Agent Rules #3 (every claim must run all 3 rules).
- The 3 rules to check:
  1. AMOUNT_MISMATCH: manual_input.amount != extracted_data.total_amount
  2. MISSING_DOCUMENTATION: category == "Meals" AND amount > 50 AND no receipt image was provided (receipt_image_url is null or empty)
  3. LOW_CONFIDENCE_EXTRACTION: extracted_data.confidence_score < 0.85
- If no rules are violated, return an EvidencePacket with `is_escalated=False`, `flagged_rule_ids=[]`, and `explanation="Claim cleared policy checks."`
- If rule(s) are violated, set `is_escalated=True`, add the triggered rule IDs to `flagged_rule_ids`, and create a clear consolidated explanation, e.g., "Amount claimed is $100 but receipt total is $85."

Show me the plan before writing code.
```

### Prompt 3.2 — Unit test the rules engine
```
Write backend/tests/test_policy_validation.py with pytest covering:
- A clean claim (no violations) returns is_escalated=False, empty list
- An amount mismatch triggers AMOUNT_MISMATCH with correct explanation text
- A $75 meal with no receipt triggers MISSING_DOCUMENTATION
- A claim with confidence_score of 0.6 triggers LOW_CONFIDENCE_EXTRACTION
- A claim that triggers multiple rules (e.g., amount mismatch + low confidence) contains BOTH rule IDs in flagged_rule_ids and a consolidated explanation.

This directly maps to PRD Story 1 and Story 2 acceptance criteria — use those as your test cases.
```

**Verify:** Run `pytest backend/tests/ -v` and make sure every test passes before moving on. This is your Testing & Verification score (15%).

**Commit:** `git commit -m "feat: custom skill - policy validation engine + tests"`

---

## PHASE 4 — Wiring the Decision Gate + Audit Log

### Prompt 4.1 — The core claim submission endpoint
```
Per docs/architecture.md, PRD Story 1/2/3, and AGENTS.md rules #1 and #2, build the main claim submission flow.

Create backend/routes/claims.py:
- POST /claims — accepts manual_inputs + receipt image upload (optional, to allow testing missing receipt rule)
  1. Save the claim to Firestore with status PENDING, and write an audit_log entry (actor: EMPLOYEE, action: "submitted")
  2. If an image is uploaded, save it to Firebase Storage and update the claim with the receipt_image_url
  3. If an image is uploaded, call the Receipt Extraction Agent and write an audit_log entry (actor: CUSTOM_AGENT, action: "extracted", details: the extracted JSON). If no image, set extracted_data to default empty values (with 0.0 confidence).
  4. Call the Policy Validation Skill — per Agent Rules #1, this must ALWAYS run, no bypassing. Write an audit_log entry showing that the policy check has run.
  5. If no violation (is_escalated is False): set status = AUTO_APPROVED, write audit_log entry (actor: CUSTOM_SKILL, action: "auto-cleared")
  6. If violation (is_escalated is True): set status = ESCALATED, save the evidence_packet, write audit_log entry (actor: CUSTOM_SKILL, action: "flagged", details: the rule(s) that triggered)
  7. Return the final claim object including its status

- GET /claims/{claim_id} — returns a claim with its full audit_logs subcollection, ordered chronologically

Every state transition must write to audit_logs per Agent Rules #2 — no silent transitions. Register these routes in main.py.
```

**Verify:** Manually submit a test claim via the FastAPI `/docs` Swagger UI. Confirm:
- Clean claim → `AUTO_APPROVED`, never touches human queue
- Bad claim → `ESCALATED`, has an evidence packet listing rules triggered
- Both have full audit trails in Firestore

### Prompt 4.2 — Approver decision endpoint
```
Add to backend/routes/claims.py:
- GET /claims/escalated — returns all claims with status ESCALATED, for the approver dashboard queue
- POST /claims/{claim_id}/decision — accepts {"decision": "APPROVE" | "REJECT"}, updates status to MANUAL_APPROVED or MANUAL_REJECTED, and writes an audit_log entry (actor: APPROVER, action: the decision, with timestamp) per PRD Story 3.
```

**Commit:** `git commit -m "feat: claim submission decision gate + approver endpoint"`

---

## PHASE 5 — Frontend (Next.js)

### Prompt 5.1 — Scaffold + Submit UI
```
Per docs/prd.md section "Simple Submit UI" and the Scope Boundaries table (only JPEG/PNG uploads, no auth — use a simple view toggle instead), scaffold a Next.js + Tailwind frontend in /frontend.

Initialize Next.js in the /frontend directory using:
`npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`

Once set up, build a single submission page (src/app/submit/page.tsx):
- Form fields: amount, category (dropdown: Meals, Travel, Supplies, Other), date, cost_center
- File upload for one receipt image (JPEG/PNG only)
- On submit, POST to the backend /claims endpoint (handle file upload as multipart/form-data)
- Show a simple result: "Auto-Approved ✅" or "Sent for Review ⏳" based on the response status
- Keep styling clean, modern, and minimal.

Also add a basic header/navigation bar with a toggle/link to /approver (no real auth, just separate routes per PRD scope).
```

### Prompt 5.2 — Approver dashboard
```
Per docs/prd.md "Approver Triage Dashboard" and Story 3, build src/app/approver/page.tsx:
- Fetch and list all claims from GET /claims/escalated
- Clicking a claim opens a detail view showing:
  - The receipt image on one side
  - The Evidence Packet explanation on the other side (e.g. "Flagged: Amount claimed is $100, but receipt total is $85")
  - The claim's audit log timeline underneath (Submitted -> Extracted -> Flagged -> ...)
  - Two buttons: Approve / Reject, calling POST /claims/{id}/decision
- After a decision, remove the claim from the queue and show a confirmation
```

**Verify:** Run both frontend (`npm run dev` in frontend) and backend together. Do a full manual walkthrough:
1. Submit a clean $15 meal claim → should auto-approve instantly
2. Submit a $75 meal claim with no receipt → should show "Sent for Review"
3. Open the approver dashboard, see the flagged claim with a clear evidence packet
4. Approve/reject it, confirm the audit log updates

**Commit:** `git commit -m "feat: submit UI + approver triage dashboard"`

---

## PHASE 6 — Testing, CI/CD, and Non-Negotiables

This is the phase most teams under-invest in — and per the hackathon deck, it's an **entry gate**, not just a score category.

### Prompt 6.1 — Playwright end-to-end test
```
Set up Playwright for the frontend in the /frontend directory. Write one e2e test in frontend/tests/e2e/claim-flow.spec.ts that:
1. Visits /submit
2. Fills in a clean claim (under $50, Meals category) with a valid test receipt image
3. Submits and asserts "Auto-Approved" appears
4. Visits /submit again, fills in a $75 Meals claim with no image
5. Submits and asserts "Sent for Review" appears
6. Visits /approver and asserts the flagged claim appears in the queue
```

### Prompt 6.2 — Linting + pre-commit
```
Add Ruff for the Python backend and ESLint for the Next.js frontend, per docs/architecture.md's Quality & CI section. Configure both with sensible defaults. Add a pre-commit hook config (.pre-commit-config.yaml) in the project root that runs Ruff and ESLint before every commit.
```

### Prompt 6.3 — GitHub Actions CI pipeline
```
Create .github/workflows/ci.yml that on every push:
1. Installs backend deps and runs pytest
2. Installs frontend deps, builds the Next.js app
3. Runs the Playwright e2e test (uses start-server-and-test to orchestrate starting backend and frontend, then running tests)
4. Runs Ruff and ESLint as separate steps
Fail the workflow if any step fails.
```

**Verify:** Push to GitHub and actually watch the Actions tab turn green. This single green checkmark is one of your five non-negotiable entry checkpoints.

**Commit:** `git commit -m "chore: CI pipeline, linting, e2e tests"`

---

## PHASE 7 — The Remaining Checkpoint Docs

You already have Project Brief, Architecture, PRD, Agent Rules, and Agents & Skills Specification — good.

### Prompt 7.1 — Tag a release
```bash
git tag -a v1.0.0 -m "Fairline MVP - hackathon Day 1 submission"
git push origin v1.0.0
```
Also create a GitHub Release from this tag in the GitHub UI, with a short description.

---

## PHASE 8 — Final Touches (Do This Last, With Time Remaining)

1. **Re-read your own docs against your build.** Open `docs/prd.md` acceptance criteria one by one and manually confirm each is actually true in the running app. Don't trust memory — click through it.
2. **Record your ~3 minute demo video** showing: submit a clean claim → auto-approve → submit a flagged claim → approver dashboard → approve/reject → audit log. Screen record with OBS or even your phone pointed at the screen if needed.
3. **Clean commit history check.** Run `git log --oneline` — if it's one giant dump instead of progressive commits, it's too late to fully fix, but at least make sure your last few commits are clean and message clearly.
4. **Double check the 5 non-negotiables one final time:**
   - [ ] `docs/architecture.md` present
   - [ ] `AGENTS.md` present
   - [ ] App builds and runs from a fresh clone (`git clone` into a new folder and try it)
   - [ ] `AGENTS_AND_SKILLS.md` present, both custom agent + skill documented
   - [ ] GitHub Actions shows green on your latest commit
5. **Never commit your `.env` file or API keys.** Double-check `.gitignore` includes `.env`, `*.env`, and Firebase service account JSON files before your final push.
