import { test, expect } from "@playwright/test";
test.use({ deviceScaleFactor: 2 });
test("高畫素大畫布不超過像素預算，縮放後維持正確畫面比例", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).maxArenaPixels = 0;
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = type.prototype.viewport;
      type.prototype.viewport = function (...args) {
        (window as any).maxArenaPixels = Math.max(
          (window as any).maxArenaPixels,
          this.canvas.width * this.canvas.height,
        );
        return original.apply(this, args);
      };
    }
  });
  const action = (a: string) => page.locator(`[data-action="${a}"]`);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await action("play").first().click();
  await action("quick").click();
  await action("confirm-team").click();
  await action("begin-match").click();
  await page.keyboard.press("Space");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "battle", {
    timeout: 12000,
  });
  const canvas = page.locator("#stage canvas");
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 3840, height: 2160 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(() =>
        canvas.evaluate((c) =>
          Math.abs(
            c.getBoundingClientRect().width - c.parentElement!.clientWidth,
          ),
        ),
      )
      .toBeLessThan(1);
    await expect
      .poll(() =>
        canvas.evaluate(
          (c) =>
            (c as HTMLCanvasElement).width * (c as HTMLCanvasElement).height,
        ),
      )
      .toBeLessThanOrEqual(2400000);
    const metrics = await canvas.evaluate((c) => {
      const el = c as HTMLCanvasElement,
        r = el.getBoundingClientRect();
      return { w: el.width, h: el.height, cssRatio: r.width / r.height };
    });
    expect(metrics.w).toBeGreaterThan(100);
    expect(metrics.h).toBeGreaterThan(100);
    expect(Math.abs(metrics.w / metrics.h - metrics.cssRatio)).toBeLessThan(
      0.01,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => (window as any).maxArenaPixels),
  ).toBeLessThanOrEqual(2400000);
});
