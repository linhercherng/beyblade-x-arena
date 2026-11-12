import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const metrics = (page: import("@playwright/test").Page) => page.evaluate(() => (window as any).impactMetrics());

test("碰撞有亮芯、拖尾與短震動，密集事件有上限，暫停凍結", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/tests/fixtures/impact.html");
  await page.locator("#capture").click();
  await page.locator("#heavy").click();
  await expect.poll(async () => (await metrics(page)).streaks).toBeGreaterThan(0);
  const frozen = await metrics(page);
  expect(frozen.flashes).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/impact-v070.png" });
  await page.waitForTimeout(150);
  expect((await metrics(page)).quaternion).toEqual(frozen.quaternion);
  await page.locator("#rapid").click();
  expect((await metrics(page)).particles).toBeLessThanOrEqual(360);
  await page.locator("#pause").click();
  await expect.poll(async () => (await metrics(page)).particles).toBe(0);
});

test("最大配樂音量時重擊仍在前景，短暫壓低配樂後恢復且無削波", async ({ page }) => {
  await page.goto("/tests/fixtures/impact.html");
  await page.locator("#bgm").click();
  await page.locator("#volume").fill("1");
  await expect.poll(async () => (await metrics(page)).playing).toBe("battle");
  await page.waitForTimeout(600);
  await page.locator("#heavy").click();
  await expect.poll(async () => (await metrics(page)).peakSfx).toBeGreaterThan(.03);
  const hit = await metrics(page);
  expect(hit.peakSfx).toBeGreaterThan(hit.musicAtPeak * 1.5);
  expect(hit.duck).toBeLessThan(.8);
  expect(hit.music).toBeLessThanOrEqual(.43);
  expect(hit.peakMix).toBeLessThan(.95);
  await expect.poll(async () => (await metrics(page)).duck).toBeGreaterThan(.97);
  await page.locator("#rapid").click();
  await page.waitForTimeout(150);
  expect((await metrics(page)).peakMix).toBeLessThan(.95);
  writeFileSync("artifacts/impact-audio-v070.json", JSON.stringify({ hit, rapid: await metrics(page) }, null, 2));
});

test("減少動態效果不震動或閃光，手機火花數量受控", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/fixtures/impact.html");
  await page.locator("#heavy").click();
  const hit = await metrics(page);
  expect(hit.shake).toBe(0);
  expect(hit.flashes).toBe(0);
  expect(hit.particles).toBeLessThanOrEqual(8);
});
