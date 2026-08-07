# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend\tests\e2e\claim-flow.spec.ts >> Fairline Claim Triage Flow >> should escalate a meals claim over $50 with no receipt image
- Location: frontend\tests\e2e\claim-flow.spec.ts:43:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/submit", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Fairline Claim Triage Flow", () => {
  4   |   
  5   |   test("should auto-approve a clean claim under $50", async ({ page }) => {
  6   |     // Intercept and mock the POST /claims API response
  7   |     await page.route("**/claims", async (route) => {
  8   |       if (route.request().method() === "POST") {
  9   |         await route.fulfill({
  10  |           status: 200,
  11  |           contentType: "application/json",
  12  |           body: JSON.stringify({
  13  |             claim_id: "clean-uuid-123",
  14  |             status: "AUTO_APPROVED",
  15  |             manual_inputs: { amount: 15.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
  16  |             receipt_image_url: null,
  17  |             extracted_data: { merchant: "Local Cafe", total_amount: 15.00, date: "2026-08-07", confidence_score: 0.95 },
  18  |             evidence_packet: { is_escalated: false, flagged_rule_ids: [], explanation: "Claim cleared policy checks." }
  19  |           })
  20  |         });
  21  |       } else {
  22  |         await route.continue();
  23  |       }
  24  |     });
  25  | 
  26  |     // 1. Navigate to submission form
  27  |     await page.goto("/submit");
  28  |     
  29  |     // 2. Fill in claim parameters
  30  |     await page.fill('input[type="number"]', "15.00");
  31  |     await page.selectOption("select", "Meals");
  32  |     await page.fill('input[type="date"]', "2026-08-07");
  33  |     await page.fill('input[placeholder="e.g. ENG, MKT, SALES"]', "ENG");
  34  |     
  35  |     // 3. Submit the claim
  36  |     await page.click('button[type="submit"]');
  37  |     
  38  |     // 4. Assert the glowing green "Auto-Approved" card and comparative data rendering
  39  |     await expect(page.locator("h2")).toHaveText("Claim Auto-Approved");
  40  |     await expect(page.locator("table")).toContainText("$15.00");
  41  |   });
  42  | 
  43  |   test("should escalate a meals claim over $50 with no receipt image", async ({ page }) => {
  44  |     // Intercept and mock the POST /claims API response
  45  |     await page.route("**/claims", async (route) => {
  46  |       if (route.request().method() === "POST") {
  47  |         await route.fulfill({
  48  |           status: 200,
  49  |           contentType: "application/json",
  50  |           body: JSON.stringify({
  51  |             claim_id: "escalated-uuid-456",
  52  |             status: "ESCALATED",
  53  |             manual_inputs: { amount: 75.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
  54  |             receipt_image_url: null,
  55  |             extracted_data: { merchant: "N/A", total_amount: 0.00, date: "N/A", confidence_score: 0.00 },
  56  |             evidence_packet: {
  57  |               is_escalated: true,
  58  |               flagged_rule_ids: ["MISSING_DOCUMENTATION"],
  59  |               explanation: "Missing receipt for category 'Meals' and amount exceeds $50.00."
  60  |             }
  61  |           })
  62  |         });
  63  |       } else {
  64  |         await route.continue();
  65  |       }
  66  |     });
  67  | 
  68  |     // 1. Navigate to submission form
> 69  |     await page.goto("/submit");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  70  |     
  71  |     // 2. Fill in claim parameters exceeding $50.00 for Meals
  72  |     await page.fill('input[type="number"]', "75.00");
  73  |     await page.selectOption("select", "Meals");
  74  |     await page.fill('input[type="date"]', "2026-08-07");
  75  |     await page.fill('input[placeholder="e.g. ENG, MKT, SALES"]', "ENG");
  76  |     
  77  |     // 3. Submit
  78  |     await page.click('button[type="submit"]');
  79  |     
  80  |     // 4. Assert review queue/escalation state triggers
  81  |     await expect(page.locator("h2")).toHaveText("Sent for Manager Review");
  82  |     await expect(page.locator("text=Missing receipt for category 'Meals'")).toBeVisible();
  83  |   });
  84  | 
  85  |   test("should list escalated claims in the approver dashboard queue", async ({ page }) => {
  86  |     // Intercept and mock GET /claims/escalated response
  87  |     await page.route("**/claims/escalated", async (route) => {
  88  |       await route.fulfill({
  89  |         status: 200,
  90  |         contentType: "application/json",
  91  |         body: JSON.stringify([
  92  |           {
  93  |             claim_id: "escalated-uuid-456",
  94  |             status: "ESCALATED",
  95  |             manual_inputs: { amount: 75.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
  96  |             receipt_image_url: null,
  97  |             extracted_data: { merchant: "N/A", total_amount: 0.00, date: "N/A", confidence_score: 0.00 },
  98  |             evidence_packet: {
  99  |               is_escalated: true,
  100 |               flagged_rule_ids: ["MISSING_DOCUMENTATION"],
  101 |               explanation: "Missing receipt for category 'Meals' and amount exceeds $50.00."
  102 |             }
  103 |           }
  104 |         ])
  105 |       });
  106 |     });
  107 | 
  108 |     // Intercept and mock GET details response
  109 |     await page.route("**/claims/escalated-uuid-456", async (route) => {
  110 |       await route.fulfill({
  111 |         status: 200,
  112 |         contentType: "application/json",
  113 |         body: JSON.stringify({
  114 |           claim_id: "escalated-uuid-456",
  115 |           status: "ESCALATED",
  116 |           manual_inputs: { amount: 75.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
  117 |           receipt_image_url: null,
  118 |           extracted_data: { merchant: "N/A", total_amount: 0.00, date: "N/A", confidence_score: 0.00 },
  119 |           evidence_packet: {
  120 |             is_escalated: true,
  121 |             flagged_rule_ids: ["MISSING_DOCUMENTATION"],
  122 |             explanation: "Missing receipt for category 'Meals' and amount exceeds $50.00."
  123 |           },
  124 |           audit_logs: [
  125 |             { log_id: "log-1", timestamp: "2026-08-08T00:00:00Z", actor: "EMPLOYEE", action: "submitted", details: null },
  126 |             { log_id: "log-2", timestamp: "2026-08-08T00:00:02Z", actor: "CUSTOM_SKILL", action: "policy_checked", details: null }
  127 |           ]
  128 |         })
  129 |       });
  130 |     });
  131 | 
  132 |     // 1. Visit Approver view
  133 |     await page.goto("/approver");
  134 |     
  135 |     // 2. Assert escalated claim card exists in queue
  136 |     await expect(page.locator("text=$75.00")).toBeVisible();
  137 |     await expect(page.locator("text=CC: ENG")).toBeVisible();
  138 |     
  139 |     // 3. Click the claim to load details split-screen
  140 |     await page.click("text=$75.00");
  141 |     
  142 |     // 4. Assert details and timeline logs are active
  143 |     await expect(page.locator("h4")).toContainText("Violations Detected:");
  144 |     await expect(page.locator("text=Missing receipt for category 'Meals'")).toBeVisible();
  145 |     await expect(page.locator("text=Employee")).toBeVisible();
  146 |   });
  147 | });
  148 | 
```