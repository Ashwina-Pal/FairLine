import { test, expect } from "@playwright/test";

test.describe("Fairline Claim Triage Flow", () => {
  
  test("should auto-approve a clean claim under $50", async ({ page }) => {
    // Intercept and mock the POST /claims API response
    await page.route("**/claims", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            claim_id: "clean-uuid-123",
            status: "AUTO_APPROVED",
            manual_inputs: { amount: 15.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
            receipt_image_url: null,
            extracted_data: { merchant: "Local Cafe", total_amount: 15.00, date: "2026-08-07", confidence_score: 0.95 },
            evidence_packet: { is_escalated: false, flagged_rule_ids: [], explanation: "Claim cleared policy checks." }
          })
        });
      } else {
        await route.continue();
      }
    });

    // 1. Navigate to submission form
    await page.goto("/submit");
    
    // 2. Fill in claim parameters
    await page.fill('input[type="number"]', "15.00");
    await page.selectOption("select", "Meals");
    await page.fill('input[type="date"]', "2026-08-07");
    await page.fill('input[placeholder="e.g. ENG, MKT, SALES"]', "ENG");
    
    // 3. Submit the claim
    await page.click('button[type="submit"]');
    
    // 4. Assert the glowing green "Auto-Approved" card and comparative data rendering
    await expect(page.locator("h2")).toHaveText("Claim Auto-Approved");
    await expect(page.locator("table")).toContainText("$15.00");
  });

  test("should escalate a meals claim over $50 with no receipt image", async ({ page }) => {
    // Intercept and mock the POST /claims API response
    await page.route("**/claims", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            claim_id: "escalated-uuid-456",
            status: "ESCALATED",
            manual_inputs: { amount: 75.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
            receipt_image_url: null,
            extracted_data: { merchant: "N/A", total_amount: 0.00, date: "N/A", confidence_score: 0.00 },
            evidence_packet: {
              is_escalated: true,
              flagged_rule_ids: ["MISSING_DOCUMENTATION"],
              explanation: "Missing receipt for category 'Meals' and amount exceeds $50.00."
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // 1. Navigate to submission form
    await page.goto("/submit");
    
    // 2. Fill in claim parameters exceeding $50.00 for Meals
    await page.fill('input[type="number"]', "75.00");
    await page.selectOption("select", "Meals");
    await page.fill('input[type="date"]', "2026-08-07");
    await page.fill('input[placeholder="e.g. ENG, MKT, SALES"]', "ENG");
    
    // 3. Submit
    await page.click('button[type="submit"]');
    
    // 4. Assert review queue/escalation state triggers
    await expect(page.locator("h2")).toHaveText("Sent for Manager Review");
    await expect(page.locator("text=Missing receipt for category 'Meals'")).toBeVisible();
  });

  test("should list escalated claims in the approver dashboard queue", async ({ page }) => {
    // Intercept and mock GET /claims/escalated response
    await page.route("**/claims/escalated", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            claim_id: "escalated-uuid-456",
            status: "ESCALATED",
            manual_inputs: { amount: 75.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
            receipt_image_url: null,
            extracted_data: { merchant: "N/A", total_amount: 0.00, date: "N/A", confidence_score: 0.00 },
            evidence_packet: {
              is_escalated: true,
              flagged_rule_ids: ["MISSING_DOCUMENTATION"],
              explanation: "Missing receipt for category 'Meals' and amount exceeds $50.00."
            }
          }
        ])
      });
    });

    // Intercept and mock GET details response
    await page.route("**/claims/escalated-uuid-456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          claim_id: "escalated-uuid-456",
          status: "ESCALATED",
          manual_inputs: { amount: 75.00, category: "Meals", date: "2026-08-07", cost_center: "ENG" },
          receipt_image_url: null,
          extracted_data: { merchant: "N/A", total_amount: 0.00, date: "N/A", confidence_score: 0.00 },
          evidence_packet: {
            is_escalated: true,
            flagged_rule_ids: ["MISSING_DOCUMENTATION"],
            explanation: "Missing receipt for category 'Meals' and amount exceeds $50.00."
          },
          audit_logs: [
            { log_id: "log-1", timestamp: "2026-08-08T00:00:00Z", actor: "EMPLOYEE", action: "submitted", details: null },
            { log_id: "log-2", timestamp: "2026-08-08T00:00:02Z", actor: "CUSTOM_SKILL", action: "policy_checked", details: null }
          ]
        })
      });
    });

    // 1. Visit Approver view
    await page.goto("/approver");
    
    // 2. Assert escalated claim card exists in queue
    await expect(page.locator("text=$75.00").first()).toBeVisible();
    await expect(page.locator("text=CC: ENG").first()).toBeVisible();
    
    // 3. Click the claim to load details split-screen
    await page.locator("text=$75.00").first().click();
    
    // 4. Assert details and timeline logs are active
    await expect(page.locator("h4")).toContainText("Violations Detected:");
    await expect(page.locator("text=Missing receipt for category 'Meals'").first()).toBeVisible();
    await expect(page.locator("text=Employee")).toBeVisible();
  });
});
