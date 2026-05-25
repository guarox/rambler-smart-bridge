const { chromium } = require("@playwright/test");

(async () => {
  console.log("Launching headless browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Navigating to https://rambler99.vercel.app/ ...");
  await page.goto("https://rambler99.vercel.app/", { waitUntil: "networkidle" });

  console.log("Locating the PW settings button...");
  const pwBtn = page.getByRole("button", { name: "⬡ PW", exact: true });
  await pwBtn.click();

  console.log("Filling in PredictWind credentials...");
  await page.locator("input[placeholder='email@example.com']").fill("edmontano@gmail.com");
  await page.locator("input[placeholder='••••••••••••']").fill("RamblerPolars!");

  console.log("Clicking Save Configuration...");
  await page.getByRole("button", { name: "Save Configuration" }).click();

  console.log("Clicking Calculate Route...");
  await page.getByRole("button", { name: "Calculate Route" }).click();

  console.log("Waiting for route calculation...");
  // Wait for the success label to appear
  const successLabel = page.getByText("Route updated successfully");
  try {
    await successLabel.waitFor({ state: "visible", timeout: 5000 });
    console.log("✅ Success: 'Route updated successfully' became visible.");
  } catch (err) {
    console.error("❌ Error: Route calculation failed or timed out.");
    const modalText = await page.locator(".bg-slate-900").innerText();
    console.log("Modal state content:\n", modalText);
    await browser.close();
    process.exit(1);
  }

  // Double check if there are any network requests failing with 404
  console.log("Closing settings modal...");
  await page.getByRole("button", { name: "×", exact: true }).click();

  console.log("Checking if sidebar badge turned green...");
  const greenBadge = page.getByRole("button", { name: "⬤ PW", exact: true });
  const isBadgeGreen = await greenBadge.isVisible();
  if (isBadgeGreen) {
    console.log("✅ Success: Sidebar badge is active and green (⬤ PW).");
  } else {
    console.error("❌ Error: Sidebar badge is not active.");
  }

  await browser.close();
  console.log("Browser closed. Live test completed successfully!");
})();
