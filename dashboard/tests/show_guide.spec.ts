import { test } from "@playwright/test";
import { mkdirSync } from "fs";
mkdirSync("/tmp/guide_shots", { recursive: true });

test("show guide location", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Arrow annotation: just screenshot the header area
  await page.screenshot({ path: "/tmp/guide_shots/header_closed.png", clip: { x: 0, y: 0, width: 768, height: 60 } });
  await page.getByLabel("Open guide").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/guide_shots/guide_open.png" });
  await ctx.close();
});
