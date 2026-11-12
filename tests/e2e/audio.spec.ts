import { test, expect } from "@playwright/test";
import tracks from "../../src/music-tracks.json" with { type: "json" };

const metrics = (page: import("@playwright/test").Page) => page.evaluate(() => (window as any).audioMetrics());

test("真實音訊解碼、場景切換、音量、暫停續播與全域靜音", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/tests/fixtures/audio.html");
  expect((await metrics(page)).context).toBeNull();
  await page.locator("#menu").click();
  await expect.poll(async () => (await metrics(page)).playing).toBe("menu");
  await expect.poll(async () => (await metrics(page)).rms).toBeGreaterThan(.003);
  for (const mode of ["battle", "clutch", "results"] as const) {
    await page.locator(`#${mode}`).click();
    await expect.poll(async () => (await metrics(page)).playing).toBe(mode);
    await expect.poll(async () => (await metrics(page)).rms).toBeGreaterThan(.003);
    expect(Math.abs((await metrics(page)).duration - tracks[mode].duration)).toBeLessThan(.001);
  }
  await page.locator("#pause").click();
  await expect.poll(async () => (await metrics(page)).playing).toBeNull();
  await expect.poll(async () => (await metrics(page)).rms).toBeLessThan(.0001);
  await page.locator("#results").click();
  await expect.poll(async () => (await metrics(page)).playing).toBe("results");
  expect((await metrics(page)).offset).toBeGreaterThan(0);
  await page.locator("#volume").fill("0");
  await expect.poll(async () => (await metrics(page)).rms).toBeLessThan(.0001);
  await page.locator("#volume").fill("0.6");
  await expect.poll(async () => (await metrics(page)).rms).toBeGreaterThan(.003);
  await page.locator("#mute").click();
  await expect.poll(async () => (await metrics(page)).rms).toBeLessThan(.0001);
  await page.reload();
  await page.locator("#menu").click();
  expect((await metrics(page)).muted).toBe(true);
  await expect.poll(async () => (await metrics(page)).rms).toBeLessThan(.0001);
  expect(errors).toEqual([]);
});

test("慢速載入在暫停後不會突然播放，禁用儲存仍可使用配樂", async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route("**/audio/battle.mp3", async route => {
    requested = true;
    await hold;
    await route.continue();
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  await page.goto("/tests/fixtures/audio.html");
  await page.locator("#battle").click();
  await expect.poll(() => requested).toBe(true);
  await page.locator("#pause").click();
  release();
  await page.waitForResponse("**/audio/battle.mp3");
  await page.waitForTimeout(700);
  expect((await metrics(page)).playing).toBeNull();
  expect((await metrics(page)).rms).toBeLessThan(.0001);
  await page.locator("#menu").click();
  await expect.poll(async () => (await metrics(page)).rms).toBeGreaterThan(.003);
});

test("缺少單首配樂只失敗一次，其他曲目仍可播放", async ({ page }) => {
  let requests = 0;
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/audio/menu.mp3", async route => {
    requests++;
    await route.fulfill({ status: 404, body: "missing" });
  });
  await page.goto("/tests/fixtures/audio.html");
  await page.locator("#menu").click();
  await expect.poll(() => requests).toBe(1);
  await page.waitForTimeout(600);
  expect(requests).toBe(1);
  await page.locator("#battle").click();
  await expect.poll(async () => (await metrics(page)).rms).toBeGreaterThan(.003);
  expect(errors).toEqual([]);
});
