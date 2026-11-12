import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
test.use({ video: { mode: "on", size: { width: 960, height: 640 } } });
test("低速旋轉實際渲染連續、暫停精確且軌跡不重建幾何", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 960, height: 640 });
  await page.goto("/tests/fixtures/motion.html");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(5500);
  const metrics = await page.evaluate(() => (window as any).motionMetrics());
  expect(metrics.geometryStable).toBe(true);
  expect(metrics.deltas.length).toBeGreaterThan(60);
  expect(metrics.deltas.filter((d: number) => d === 0).length).toBeLessThan(
    metrics.deltas.length * 0.03,
  );
  expect(metrics.deltas.every((d: number) => Number.isFinite(d) && d < 2)).toBe(
    true,
  );
  const sorted = metrics.frames.slice().sort((a: number, b: number) => a - b);
  writeFileSync(
    "artifacts/motion-metrics.json",
    JSON.stringify(
      {
        frames: sorted.length,
        medianFrameMs: sorted[Math.floor(sorted.length * 0.5)],
        p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
        stationaryFrames: metrics.deltas.filter((d: number) => d === 0).length,
        geometryStable: metrics.geometryStable,
      },
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "暫停", exact: true }).click();
  const paused = await page.evaluate(
    () => (window as any).motionMetrics().quaternions,
  );
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as any).motionMetrics().quaternions),
  ).toEqual(paused);
  await page.getByRole("button", { name: "繼續", exact: true }).click();
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
  const video = page.video();
  await page.close();
  await video!.saveAs("artifacts/slow-spin-v040.webm");
});
