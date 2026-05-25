import { test } from "@playwright/test";
import { mkdirSync } from "fs";

test.setTimeout(90000);
const OUT = "/tmp/tablet_screenshots";
mkdirSync(OUT, { recursive: true });

async function audit(browser: import("@playwright/test").Browser, name: string, w: number, h: number) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/${name}_fold.png` });
  await page.screenshot({ path: `${OUT}/${name}_full.png`, fullPage: true });

  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}_perf_marks.png` });

  const map = page.locator(".leaflet-container");
  if (await map.count() > 0) {
    await map.evaluate(el => el.scrollIntoView());
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}_map.png` });
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}_bottom.png` });

  await page.getByLabel("Open guide").click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}_guide.png` });

  await ctx.close();
}

test("ipad portrait 768x1024", async ({ browser }) => {
  await audit(browser, "portrait", 768, 1024);
});

test("ipad landscape 1024x768", async ({ browser }) => {
  await audit(browser, "landscape", 1024, 768);
});
