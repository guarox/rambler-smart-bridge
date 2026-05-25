import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("rambler_waypoints");
    localStorage.removeItem("rambler_pw_config");
    localStorage.removeItem("rambler_pw_routes");
  });
  await page.reload();
  await expect(page.getByText("LIVE").first()).toBeVisible();
});

test("PredictWind settings modal and routing works", async ({ page }) => {
  // 1. Mock the PredictWind API endpoint
  await page.route(/\/api\/predictwind/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: Math.round(Date.now() / 1000),
        source: "PredictWind Routing Engine (Test Mock)",
        routes: {
          PWG: {
            points: [
              [41.875, -87.535],
              [42.2, -87.3],
              [42.5, -87.2]
            ],
            tacksGybes: [
              { lat: 42.2, lon: -87.3, type: "tack", twa: 41, time: "+3h" }
            ],
            summary: {
              distanceNm: 38.5,
              timeHrs: 5.2,
              avgSpeed: 7.4
            }
          }
        }
      })
    });
  });

  // 2. Open PredictWind Settings panel
  const pwBtn = page.getByRole("button", { name: "⬡ PW", exact: true });
  await expect(pwBtn).toBeVisible();
  await pwBtn.click();

  // 3. Check settings modal header & elements
  await expect(page.getByRole("heading", { name: "PredictWind Routing Setup" })).toBeVisible();
  
  // Fill in mock credentials
  const emailInput = page.locator("input[placeholder='email@example.com']");
  await emailInput.fill("tactician@rambler99.com");
  
  const tokenInput = page.locator("input[placeholder='••••••••••••']");
  await tokenInput.fill("super-secret-password");

  // Select/Deselect a model to test interaction
  const pwgCheckbox = page.locator("input[type='checkbox']").first();
  await expect(pwgCheckbox).toBeChecked(); // PWG should be checked by default

  // 4. Click Save Configuration
  await page.getByRole("button", { name: "Save Configuration" }).click();

  // 5. Click Calculate Route to trigger mock call
  await page.getByRole("button", { name: "Calculate Route" }).click();

  // 6. Verify success status updates in modal
  await expect(page.getByText("Route updated successfully")).toBeVisible({ timeout: 5000 });

  // 7. Close settings modal and verify color-coded live badge is green
  await page.getByRole("button", { name: "×", exact: true }).click();
  await expect(page.getByRole("button", { name: "⬤ PW", exact: true })).toBeVisible();
});
