import { test, expect } from "@playwright/test";
test("中文名稱可搜尋，戰鬥全寬放大且可切換全螢幕", async ({ page }) => {
  const action = (a: string) => page.locator(`[data-action="${a}"]`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await action("catalog").first().click();
  await expect(page.locator(".bey-card .bey-name")).toHaveCount(91);
  await page.getByRole("searchbox").fill("蒼龍神劍");
  await expect(page.locator(".bey-card")).toHaveCount(1);
  await expect(page.locator(".bey-card")).toContainText("Dran Sword");
  await action("detail").first().click();
  await expect(page.getByRole("dialog")).toContainText("中文參考譯名");
  await page.keyboard.press("Escape");
  await action("play").first().click();
  await action("quick").click();
  await action("confirm-team").click();
  await action("begin-match").click();
  await page.keyboard.press("Space");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "battle", {
    timeout: 12000,
  });
  await action("pause").first().click();
  await expect(page.locator(".sidebar")).toBeHidden();
  const desktop = await page.locator("#stage").boundingBox();
  expect(desktop!.width).toBeGreaterThan(1360);
  expect(desktop!.height).toBeGreaterThan(650);
  await expect(page.locator(".fighter-0")).toContainText("蒼龍神劍");
  await action("pause").first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/battle-large-zh-desktop.png" });
  await action("pause").first().click();
  await action("fullscreen").click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.id))
    .toBe("app");
  await action("fullscreen").click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const mobile = await page.locator("#stage").boundingBox();
  expect(mobile!.width).toBeGreaterThan(370);
  expect(mobile!.height).toBeGreaterThan(500);
  await action("pause").first().click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: "artifacts/battle-large-zh-mobile.png",
    fullPage: true,
  });
});
