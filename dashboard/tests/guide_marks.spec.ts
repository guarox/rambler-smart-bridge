import { test } from "@playwright/test";
import { mkdirSync } from "fs";
mkdirSync("/tmp/guide_marks", { recursive: true });

test("marks section in guide", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.getByLabel("Open guide").click();
  await page.waitForTimeout(500);
  // Scroll to Marks section
  await page.getByText("Marks & Waypoints").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/guide_marks/marks_section.png" });
  // Scroll down to see workflow
  await page.getByText("Race Workflow").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/guide_marks/marks_workflow.png" });
  await ctx.close();
});
