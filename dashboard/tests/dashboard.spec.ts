import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("page loads with correct title and header", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Rambler Smart Bridge" })).toBeVisible();
  await expect(page.getByText("J/99 · USA 99 · MMSI 338380946")).toBeVisible();
  await expect(page.getByText("Simulated Live · 2s updates")).toBeVisible();
});

test("own boat panel shows all instrument values", async ({ page }) => {
  const panel = page.locator("div").filter({ hasText: "RAMBLER USA 99" }).first();
  await expect(panel.getByText("RAMBLER USA 99")).toBeVisible();
  await expect(panel.getByText("BSP")).toBeVisible();
  await expect(panel.getByText("7.4")).toBeVisible();
  await expect(panel.getByText("TWA", { exact: true })).toBeVisible();
  await expect(panel.getByText("38°")).toBeVisible();
  await expect(panel.getByText("14.5")).toBeVisible();
  await expect(panel.getByText("LIVE")).toBeVisible();
});

test("tactical table shows all four competitors", async ({ page }) => {
  await expect(page.getByText("TACTICAL — COMPETITORS WITHIN 2NM")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Ohana" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Paradigm Shift" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Success" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "MASKWA" })).toBeVisible();
});

test("tactical table shows correct distances", async ({ page }) => {
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(4);

  // Ohana is closest at 0.42nm
  const ohanaRow = page.locator("table tbody tr").first();
  await expect(ohanaRow.getByText("0.42")).toBeVisible();
  await expect(ohanaRow.getByText("318°")).toBeVisible();
});

test("tactical table shows higher/faster badges correctly", async ({ page }) => {
  // Ohana: we are higher and faster (green badges)
  const ohanaRow = page.locator("table tbody tr").first();
  await expect(ohanaRow.getByText(/38° vs 46°/)).toBeVisible();
  await expect(ohanaRow.getByText(/7.2 vs 6.8/)).toBeVisible();

  // Paradigm Shift: they are higher and faster (red badges)
  const paradigmRow = page.locator("table tbody tr").nth(1);
  await expect(paradigmRow.getByText(/38° vs 33°/)).toBeVisible();
});

test("map panel renders", async ({ page }) => {
  await expect(page.getByText("Race Chart")).toBeVisible();
  // Leaflet map container
  const mapContainer = page.locator(".leaflet-container");
  await expect(mapContainer).toBeVisible({ timeout: 10000 });
});

test("HRRR wind panel shows model vs reality delta", async ({ page }) => {
  await expect(page.getByText("HRRR WIND MODEL VS REALITY")).toBeVisible();
  await expect(page.getByText("HRRR SPEED")).toBeVisible();
  await expect(page.getByText("B&G ACTUAL")).toBeVisible();
  await expect(page.getByText("Δ DELTA")).toBeVisible();
  await expect(page.getByText("★ nearest")).toBeVisible();
});

test("no JS errors on load", async ({ page }) => {
  const jsErrors: string[] = [];
  // Capture uncaught JS exceptions (not network failures — tiles won't resolve in headless)
  page.on("pageerror", (err) => jsErrors.push(err.message));
  await page.waitForLoadState("networkidle");
  expect(jsErrors).toHaveLength(0);
});
