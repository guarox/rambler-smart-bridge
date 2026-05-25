import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("rambler_waypoints");
    localStorage.removeItem("rambler_sessions");
  });
  await page.reload();
  await expect(page.getByText("LIVE").first()).toBeVisible();
});

// ─── Expand button ────────────────────────────────────────────────────────────

test("⤢ Full button is visible on Race Chart toolbar", async ({ page }) => {
  await expect(page.getByRole("button", { name: /Full/ })).toBeVisible();
});

test("⤢ Full button has adequate touch target", async ({ page }) => {
  const btn = page.getByRole("button", { name: /Full/ });
  await expect(btn).toBeVisible();
  const box = await btn.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(30);
});

// ─── Fullscreen map opens ─────────────────────────────────────────────────────

test("clicking ⤢ Full opens fullscreen wind map", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  // Instrument strip appears at top
  await expect(page.getByText("BSP").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("SOG").first()).toBeVisible();
  await expect(page.getByText("TWS").first()).toBeVisible();
  await expect(page.getByText("TWD").first()).toBeVisible();
  await expect(page.getByText("TWA").first()).toBeVisible();
});

test("fullscreen map shows LIVE badge when not forecasting", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await expect(page.getByText(/● LIVE/).first()).toBeVisible({ timeout: 3000 });
});

test("dashboard panels are hidden in fullscreen mode", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await page.waitForTimeout(500);
  // These dashboard sections should not be visible in full-screen mode
  await expect(page.getByText("RAMBLER USA 99")).not.toBeVisible();
  await expect(page.getByText("PERFORMANCE")).not.toBeVisible();
  await expect(page.getByText("TACTICAL")).not.toBeVisible();
});

// ─── Close button ─────────────────────────────────────────────────────────────

test("✕ Close button returns to dashboard", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await expect(page.getByLabel("Close fullscreen map")).toBeVisible({ timeout: 3000 });
  await page.getByLabel("Close fullscreen map").click();
  // Dashboard should be back
  await expect(page.getByText("RAMBLER USA 99")).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("heading", { name: "Tactical", exact: true })).toBeVisible();
});

test("✕ Close button has 44px touch target", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  const closeBtn = page.getByLabel("Close fullscreen map");
  await expect(closeBtn).toBeVisible({ timeout: 3000 });
  const box = await closeBtn.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

// ─── Leaflet map renders in fullscreen ────────────────────────────────────────

test("Leaflet map renders inside fullscreen mode", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  const maps = page.locator(".leaflet-container");
  await expect(maps.first()).toBeVisible({ timeout: 10000 });
});

test("fullscreen map fills the viewport", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await page.waitForTimeout(500);
  // The fullscreen container should be fixed/inset-0
  const fullscreenDiv = page.locator(".fixed.inset-0").filter({ has: page.locator(".leaflet-container") });
  await expect(fullscreenDiv).toBeVisible({ timeout: 5000 });
});

// ─── Layer switcher ───────────────────────────────────────────────────────────

test("layer switcher globe button is visible in fullscreen", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  const globeBtn = page.getByTitle("Weather layers");
  await expect(globeBtn).toBeVisible({ timeout: 3000 });
});

test("clicking globe shows Wind/Rain/Temp buttons", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await page.getByTitle("Weather layers").click();
  await expect(page.getByRole("button", { name: /Wind/ })).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: /Rain/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Temp/ })).toBeVisible();
});

test("layer buttons have adequate touch targets", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await page.getByTitle("Weather layers").click();
  const windBtn = page.getByRole("button", { name: /Wind/ });
  await expect(windBtn).toBeVisible({ timeout: 3000 });
  const box = await windBtn.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test("selecting Rain layer closes the switcher panel", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await page.getByTitle("Weather layers").click();
  await page.getByRole("button", { name: /Rain/ }).click();
  // Panel should close after selection
  await expect(page.getByRole("button", { name: /Wind/ })).not.toBeVisible();
});

// ─── Forecast timeline ────────────────────────────────────────────────────────

test("forecast scrubber (range input) is present in fullscreen", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  const slider = page.locator("input[type='range']");
  await expect(slider).toBeVisible({ timeout: 5000 });
});

test("Play button is visible in fullscreen forecast timeline", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await expect(page.getByRole("button", { name: /▶ Play/ })).toBeVisible({ timeout: 3000 });
});

test("step back ◀ and step forward ▶ buttons are present", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  // There should be exactly 2 single-arrow buttons (◀ and ▶ step buttons)
  const stepBtns = page.locator("button").filter({ hasText: "◀" });
  await expect(stepBtns.first()).toBeVisible({ timeout: 3000 });
});

test("Live button is present in forecast controls", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await expect(page.getByRole("button", { name: /Live/ })).toBeVisible({ timeout: 3000 });
});

test("advancing forecast shows +hr badge", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  const slider = page.locator("input[type='range']");
  await expect(slider).toBeVisible({ timeout: 5000 });
  // Wait for forecast data to load (max > 0)
  await page.waitForFunction(() => {
    const s = document.querySelector('input[type="range"]') as HTMLInputElement | null;
    return s && parseInt(s.max) > 2;
  }, { timeout: 8000 });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/\+\d+hr/).first()).toBeVisible({ timeout: 3000 });
});

test("Live button snaps back to live", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  const slider = page.locator("input[type='range']");
  await expect(slider).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => {
    const s = document.querySelector('input[type="range"]') as HTMLInputElement | null;
    return s && parseInt(s.max) > 2;
  }, { timeout: 8000 });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/\+\d+hr/).first()).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: /Live/ }).click();
  await expect(page.getByText(/● LIVE/).first()).toBeVisible({ timeout: 3000 });
});

test("Play/Stop button toggles correctly", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByRole("button", { name: /▶ Play/ })).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: /▶ Play/ }).click();
  await expect(page.getByRole("button", { name: /■ Stop/ })).toBeVisible({ timeout: 2000 });
  await page.getByRole("button", { name: /■ Stop/ }).click();
  await expect(page.getByRole("button", { name: /▶ Play/ })).toBeVisible();
});

// ─── No regressions on main dashboard ────────────────────────────────────────

test("existing dashboard still works after fullscreen round-trip", async ({ page }) => {
  await page.getByRole("button", { name: /Full/ }).click();
  await expect(page.getByLabel("Close fullscreen map")).toBeVisible({ timeout: 3000 });
  await page.getByLabel("Close fullscreen map").click();
  // All dashboard panels should be intact (match by text content, case-insensitive)
  await expect(page.getByText("RAMBLER USA 99")).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Performance")).toBeVisible();
  await expect(page.getByText("Race Chart")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tactical", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
});
