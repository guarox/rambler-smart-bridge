import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("rambler_waypoints");
    localStorage.removeItem("rambler_sessions");
  });
  await page.reload();
  // Wait for core layout (OwnBoatPanel "● LIVE" badge)
  await expect(page.getByText("LIVE").first()).toBeVisible();
});

// ─── Page load ────────────────────────────────────────────────────────────────

test("page loads with correct title and header", async ({ page }) => {
  await expect(page).toHaveTitle("Rambler Smart Bridge");
  await expect(page.getByText(/J\/99.*USA 99/)).toBeVisible();
  await expect(page.getByText(/Simulated/)).toBeVisible();
});

test("no JS errors on load", async ({ page }) => {
  const jsErrors: string[] = [];
  page.on("pageerror", (err) => jsErrors.push(err.message));
  await page.waitForLoadState("networkidle");
  expect(jsErrors).toHaveLength(0);
});

// ─── Own boat panel ───────────────────────────────────────────────────────────

test("own boat panel shows all instrument values", async ({ page }) => {
  const panel = page.locator("div").filter({ has: page.getByRole("heading", { name: "Rambler USA 99" }) });
  await expect(panel.getByText("Rambler USA 99")).toBeVisible();
  await expect(panel.getByText("BSP").locator("..").getByText("8.0")).toBeVisible();
  await expect(panel.getByText("TWA", { exact: true }).locator("..").getByText("60°")).toBeVisible();
  await expect(panel.getByText("TWS").locator("..").getByText("15.2")).toBeVisible();
  await expect(panel.getByText("LIVE").first()).toBeVisible();
});

test("live data simulation is running", async ({ page }) => {
  await expect(page.getByText(/Simulated/)).toBeVisible();
  await expect(page.getByText("LIVE").first()).toBeVisible();
});

// ─── Start timer ──────────────────────────────────────────────────────────────

test("start timer shows initial state", async ({ page }) => {
  await expect(page.getByText("05:00")).toBeVisible();
  await expect(page.getByRole("button", { name: "▶ Start", exact: true })).toBeVisible();
});

test("start timer starts and stops countdown", async ({ page }) => {
  await page.getByRole("button", { name: "▶ Start", exact: true }).click();
  await expect(page.getByRole("button", { name: "■ Stop" })).toBeVisible();
  await page.getByRole("button", { name: "■ Stop" }).click();
  await expect(page.getByRole("button", { name: "▶ Start", exact: true })).toBeVisible();
});

test("start timer preset buttons reset the clock", async ({ page }) => {
  await page.getByRole("button", { name: "4m" }).click();
  await expect(page.getByText("04:00")).toBeVisible();
  await page.getByRole("button", { name: "3m" }).click();
  await expect(page.getByText("03:00")).toBeVisible();
  await page.getByRole("button", { name: "1m" }).click();
  await expect(page.getByText("01:00")).toBeVisible();
});

test("start timer sync button works without error", async ({ page }) => {
  const jsErrors: string[] = [];
  page.on("pageerror", err => jsErrors.push(err.message));
  await page.getByRole("button", { name: "Sync" }).click();
  expect(jsErrors).toHaveLength(0);
  await expect(page.getByRole("button", { name: "▶ Start", exact: true })).toBeVisible();
});

// ─── Performance panel ────────────────────────────────────────────────────────

test("performance panel shows VMG, polar %, and wind shift", async ({ page }) => {
  await expect(page.getByText("Performance")).toBeVisible();
  // Multiple VMG elements — just ensure at least one is visible
  await expect(page.getByText("VMG").first()).toBeVisible();
  await expect(page.getByText(/% Polar/)).toBeVisible();
  await expect(page.getByText("Wind Shift").first()).toBeVisible();
  await expect(page.getByText("Tack").first()).toBeVisible();
});

test("performance panel alarm toggle works", async ({ page }) => {
  const alarmBtn = page.getByRole("button", { name: /🔕 OFF/ });
  await expect(alarmBtn).toBeVisible();
  await alarmBtn.click();
  await expect(page.getByRole("button", { name: /🔔 ON/ })).toBeVisible();
  await page.getByRole("button", { name: /🔔 ON/ }).click();
  await expect(page.getByRole("button", { name: /🔕 OFF/ })).toBeVisible();
});

// ─── Map panel ───────────────────────────────────────────────────────────────

test("map panel renders with Leaflet container", async ({ page }) => {
  await expect(page.getByText("Race Chart")).toBeVisible();
  const mapContainer = page.locator(".leaflet-container");
  await expect(mapContainer).toBeVisible({ timeout: 10000 });
});

test("laylines toggle switches ON and OFF", async ({ page }) => {
  const laylinesBtn = page.getByRole("button", { name: /Laylines/ });
  await expect(laylinesBtn).toBeVisible();
  await expect(laylinesBtn).toContainText("ON");
  await laylinesBtn.click();
  await expect(laylinesBtn).toContainText("OFF");
  await laylinesBtn.click();
  await expect(laylinesBtn).toContainText("ON");
});

test("range rings toggle switches ON and OFF", async ({ page }) => {
  const ringsBtn = page.getByRole("button", { name: /◎ Rings/ });
  await expect(ringsBtn).toBeVisible();
  await expect(ringsBtn).toContainText("OFF");
  await ringsBtn.click();
  await expect(ringsBtn).toContainText("ON");
  await ringsBtn.click();
  await expect(ringsBtn).toContainText("OFF");
});

test("fit fleet button is clickable without error", async ({ page }) => {
  const jsErrors: string[] = [];
  page.on("pageerror", err => jsErrors.push(err.message));
  await page.locator(".leaflet-container").waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: /Fleet/ }).click();
  expect(jsErrors).toHaveLength(0);
});

// ─── Ruler tool ───────────────────────────────────────────────────────────────

test("ruler mode activates on click and cursor becomes crosshair", async ({ page }) => {
  await page.locator(".leaflet-container").waitFor({ timeout: 10000 });
  // Click the Ruler tab in the mode toggle
  await page.getByRole("button", { name: "📏 Ruler" }).click();
  // The wrapper div around the map should have crosshair cursor
  const mapWrapper = page.locator("[style*='cursor: crosshair'], [style*='cursor:crosshair']").first();
  await expect(mapWrapper).toBeVisible({ timeout: 3000 });
});

test("ruler mode returns to Pan on second click", async ({ page }) => {
  const rulerBtn = page.getByRole("button", { name: "📏 Ruler" });
  await rulerBtn.click();
  // Clicking the active mode button toggles back to Pan
  await rulerBtn.click();
  // Crosshair should be gone
  const mapContainer = page.locator(".leaflet-container");
  await expect(mapContainer).toBeVisible();
  const cursor = await page.locator("div").filter({ has: mapContainer }).first().evaluate(
    el => (el as HTMLElement).style?.cursor ?? ""
  );
  expect(["", "auto", undefined].includes(cursor) || cursor !== "crosshair").toBeTruthy();
});

// Helper: scroll Leaflet container into view and return a safe click point near the top
async function mapClickPoint(page: import("@playwright/test").Page, offsetX = 0, offsetY = 0) {
  const map = page.locator(".leaflet-container");
  await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // let scroll settle
  const box = await map.boundingBox();
  if (!box) throw new Error("map container not found");
  // Click near top-left quadrant to stay within viewport
  return { x: box.x + 150 + offsetX, y: box.y + 120 + offsetY };
}

test("ruler: clicking map in ruler mode shows Clear button", async ({ page }) => {
  await page.locator(".leaflet-container").waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "📏 Ruler" }).click();

  const pt = await mapClickPoint(page);
  await page.mouse.click(pt.x, pt.y);

  await expect(page.getByRole("button", { name: "✕ Clear" })).toBeVisible({ timeout: 5000 });
});

test("ruler: second click creates measurement, Clear removes it", async ({ page }) => {
  await page.locator(".leaflet-container").waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "📏 Ruler" }).click();

  const pt = await mapClickPoint(page);
  await page.mouse.click(pt.x, pt.y);
  await expect(page.getByRole("button", { name: "✕ Clear" })).toBeVisible({ timeout: 5000 });

  await page.mouse.click(pt.x + 80, pt.y + 60);
  await expect(page.locator(".leaflet-marker-icon").filter({ hasText: /nm/ }).first()).toBeVisible({ timeout: 5000 });

  await page.getByRole("button", { name: "✕ Clear" }).click();
  await expect(page.getByRole("button", { name: "✕ Clear" })).not.toBeVisible();
});

test("ruler: switching to Pan mode clears measurement", async ({ page }) => {
  await page.locator(".leaflet-container").waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "📏 Ruler" }).click();

  const pt = await mapClickPoint(page);
  await page.mouse.click(pt.x, pt.y);
  await expect(page.getByRole("button", { name: "✕ Clear" })).toBeVisible({ timeout: 5000 });

  await page.getByRole("button", { name: "Pan" }).click();
  await expect(page.getByRole("button", { name: "✕ Clear" })).not.toBeVisible();
});

// ─── Tactical table ───────────────────────────────────────────────────────────

test("tactical table shows all four competitors", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Tactical", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Frostfire" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Meridian" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bad Latitude" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Hitchhiker" })).toBeVisible();
});

test("tactical table shows correct distances and bearings", async ({ page }) => {
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(14);
  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow.getByRole("cell", { name: "0.10", exact: true })).toBeVisible();
  await expect(firstRow.getByRole("cell", { name: "60°", exact: true })).toBeVisible();
});

test("tactical table shows higher/faster badges", async ({ page }) => {
  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow.getByText(/vs 79°/)).toBeVisible();
  const secondRow = page.locator("table tbody tr").nth(1);
  await expect(secondRow.getByText(/vs 76°/)).toBeVisible();
});

// ─── Waypoint panel ───────────────────────────────────────────────────────────

test("waypoint panel is visible with empty state message", async ({ page }) => {
  // There are two "Marks" headings potentially; find the waypoint panel one
  await expect(page.getByText(/No marks/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Ping" })).toBeVisible();
});

test("ping adds a mark entry to the list", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ping" }).click();
  // "Mark 1" may appear in both the list and the active section — just check first
  await expect(page.getByText("Mark 1").first()).toBeVisible();
  await expect(page.getByText(/No marks/i)).not.toBeVisible();
});

test("active mark shows TTM and VMG metrics after ping", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ping" }).click();
  await expect(page.getByText(/Active →/).first()).toBeVisible();
  await expect(page.getByText("TTM")).toBeVisible();
  await expect(page.getByText("Bearing").first()).toBeVisible();
});

test("delete mark removes it from the list", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ping" }).click();
  await expect(page.getByText("Mark 1").first()).toBeVisible();
  await page.locator("div.space-y-1").getByRole("button", { name: "×" }).first().click();
  await expect(page.getByText("Mark 1")).not.toBeVisible();
  await expect(page.getByText(/No marks/i)).toBeVisible();
});

test("mark type cycles through Mark → Start P → Start S", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ping" }).click();
  const typeBtn = page.getByRole("button", { name: "Mark" }).first();
  await expect(typeBtn).toBeVisible();
  await typeBtn.click();
  await expect(page.getByRole("button", { name: "Start P" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Start P" }).first().click();
  await expect(page.getByRole("button", { name: "Start S" }).first()).toBeVisible();
});

test("rounding direction toggles between Port and Stbd", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ping" }).click();
  const roundBtn = page.getByRole("button", { name: "Port" }).first();
  await expect(roundBtn).toBeVisible();
  await roundBtn.click();
  await expect(page.getByRole("button", { name: "Stbd" }).first()).toBeVisible();
});

test("next/prev cycle active mark when multiple marks exist", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ping" }).click();
  await page.getByRole("button", { name: "+ Ping" }).click();
  await expect(page.getByRole("button", { name: "← Prev" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next →" })).toBeVisible();
  await page.getByRole("button", { name: "← Prev" }).click();
  await expect(page.getByText(/Active →/).first()).toBeVisible();
});

test("marks persist across page reload via localStorage", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ping" }).click();
  await expect(page.getByText("Mark 1").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("LIVE").first()).toBeVisible();
  await expect(page.getByText("Mark 1").first()).toBeVisible({ timeout: 5000 });
});

test("add mark mode: clicking map drops a waypoint", async ({ page }) => {
  await page.locator(".leaflet-container").waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "✦ Add" }).click();

  const pt = await mapClickPoint(page);
  await page.mouse.click(pt.x, pt.y);

  await expect(page.getByText("Mark 1").first()).toBeVisible({ timeout: 5000 });
});

// ─── Wind trend panel ─────────────────────────────────────────────────────────

test("wind trend panel shows charts", async ({ page }) => {
  // The panel contains SVG line charts
  const svgs = page.locator("svg");
  await expect(svgs.first()).toBeVisible();
  // Trend-related text
  await expect(page.getByText(/VMG Upwind/i)).toBeVisible();
});

// ─── HRRR panel ───────────────────────────────────────────────────────────────

test("HRRR wind panel shows model vs reality delta", async ({ page }) => {
  await expect(page.getByText("HRRR vs B&G").first()).toBeVisible();
  await expect(page.getByText("HRRR Model").first()).toBeVisible();
  await expect(page.getByText("B&G Actual").first()).toBeVisible();
  await expect(page.getByText("Δ Delta").first()).toBeVisible();
});

// ─── Guide modal ──────────────────────────────────────────────────────────────

test("? button opens guide modal", async ({ page }) => {
  const guideBtn = page.getByLabel("Open guide");
  await expect(guideBtn).toBeVisible();
  await guideBtn.click();
  await expect(page.getByText("Tactician Guide")).toBeVisible();
  await expect(page.getByText("Instrument Panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Start Timer/ })).toBeVisible();
});

test("guide modal can be closed", async ({ page }) => {
  await page.getByLabel("Open guide").click();
  await expect(page.getByText("Tactician Guide")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByText("Tactician Guide")).not.toBeVisible();
});

test("guide modal × button closes it", async ({ page }) => {
  await page.getByLabel("Open guide").click();
  await expect(page.getByText("Tactician Guide")).toBeVisible();
  await page.getByLabel("Close guide").click();
  await expect(page.getByText("Tactician Guide")).not.toBeVisible();
});

test("guide covers all major sections", async ({ page }) => {
  await page.getByLabel("Open guide").click();
  for (const section of ["Performance Panel", "Race Chart", "Marks", "Tactical Table", "Timeline", "Wind Panels"]) {
    await expect(page.getByText(section, { exact: false }).first()).toBeVisible();
  }
});

// ─── Timeline panel ───────────────────────────────────────────────────────────

test("timeline panel is visible", async ({ page }) => {
  await expect(page.getByText("Timeline").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Race/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Export All CSV/ })).toBeVisible();
});

test("timeline shows LIVE badge in header", async ({ page }) => {
  // The header badge shows "Simulated · 2s" (LIVE mode text)
  await expect(page.getByText(/Simulated/)).toBeVisible();
});

test("timeline scrubber appears after a few frames", async ({ page }) => {
  // Wait for at least one frame to be captured
  await page.waitForTimeout(3000);
  const slider = page.locator("input[type='range']");
  await expect(slider).toBeVisible({ timeout: 5000 });
});

test("start race creates an active session", async ({ page }) => {
  await page.getByRole("button", { name: /▶ Start Race/ }).click();
  // Button changes to End Race with timer
  await expect(page.getByRole("button", { name: /End Race/ })).toBeVisible();
});

test("end race closes the session and shows saved races", async ({ page }) => {
  await page.getByRole("button", { name: /▶ Start Race/ }).click();
  await expect(page.getByRole("button", { name: /End Race/ })).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /■ End Race/ }).click();
  // Session should appear in saved races
  await expect(page.getByText("Race 1")).toBeVisible();
  // Start Race button should return
  await expect(page.getByRole("button", { name: /▶ Start Race/ })).toBeVisible();
});

test("race sessions persist across page reload", async ({ page }) => {
  await page.getByRole("button", { name: /▶ Start Race/ }).click();
  await page.getByRole("button", { name: /■ End Race/ }).click();
  await expect(page.getByText("Race 1")).toBeVisible();
  await page.reload();
  await expect(page.getByText("LIVE").first()).toBeVisible();
  // Session name should survive reload
  await expect(page.getByText("Race 1")).toBeVisible({ timeout: 5000 });
});

test("export all csv button triggers download", async ({ page }) => {
  // Wait for buffer to have data
  await page.waitForTimeout(3000);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 10000 }),
    page.getByRole("button", { name: /⬇ Export All CSV/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("rambler_capture.csv");
});

test("timeline scrubber entering replay shows REPLAY badge", async ({ page }) => {
  // Wait for at least 3 frames (6s) so we can scrub back
  await page.waitForTimeout(8000);
  const slider = page.locator("input[type='range']");
  await expect(slider).toBeVisible({ timeout: 5000 });
  // Press ArrowLeft twice — steps back 2 frames, triggering React onChange
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("⏪ REPLAY").first()).toBeVisible({ timeout: 5000 });
});

test("▶ Live button returns from replay to live", async ({ page }) => {
  await page.waitForTimeout(8000);
  const slider = page.locator("input[type='range']");
  await expect(slider).toBeVisible({ timeout: 5000 });
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("⏪ REPLAY").first()).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "▶ Live" }).click();
  await expect(page.getByText(/Simulated/)).toBeVisible({ timeout: 3000 });
});
