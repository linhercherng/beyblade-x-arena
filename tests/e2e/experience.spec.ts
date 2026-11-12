import { test, expect } from "@playwright/test";

test("遊戲配樂控制保存音量，全場盤體在桌機與手機可見", async ({ page }) => {
  const requested = new Set<string>(), errors: string[] = [];
  page.on("request", r => { if (r.url().includes("/audio/")) requested.add(r.url().split("/").at(-1)!); });
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => nativeFrame.call(window, time => {
      if (!(window as any).freezeFrames) callback(time);
    });
    const stop = AudioBufferSourceNode.prototype.stop;
    (window as any).audioStops = 0;
    AudioBufferSourceNode.prototype.stop = function (...args) {
      (window as any).audioStops++;
      return stop.apply(this, args);
    };
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("配樂設定").click();
  const slider = page.getByLabel("背景音樂音量");
  await slider.fill("35");
  await expect(page.locator("#music-volume-label")).toHaveText("35%");
  await expect.poll(() => requested.has("menu.mp3")).toBe(true);
  await page.reload();
  await page.getByLabel("配樂設定").click();
  await expect(slider).toHaveValue("35");
  await page.getByLabel("配樂設定").click();
  const action = (a: string) => page.locator(`[data-action="${a}"]`).first();
  await action("play").click();
  await action("quick").click();
  await action("confirm-team").click();
  await action("begin-match").click();
  await page.getByLabel("配樂設定").focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".music-controls")).toHaveAttribute("open", "");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "launch");
  await page.keyboard.press("Enter");
  await page.locator("h1").click();
  await page.keyboard.press("Space");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "battle", { timeout: 15000 });
  await expect.poll(() => requested.has("battle.mp3")).toBe(true);
  await action("close-up").click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "artifacts/stadium-v060-battle.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/stadium-v060-battle-mobile.png" });
  await page.getByLabel("配樂設定").click();
  const settings = await page.locator(".music-controls > div").boundingBox();
  expect(settings!.x).toBeGreaterThanOrEqual(0);
  expect(settings!.x + settings!.width).toBeLessThanOrEqual(390);
  const stops = await page.evaluate(() => (window as any).audioStops);
  await page.evaluate(() => {
    (window as any).freezeFrames = true;
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => (window as any).audioStops)).toBeGreaterThan(stops);
  expect(errors).toEqual([]);
});
