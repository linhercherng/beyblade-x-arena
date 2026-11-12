import { test, expect } from "@playwright/test";
test.use({ video: { mode: "on", size: { width: 1200, height: 800 } } });
for (const local of [false, true])
  test(`${local ? "手機2P" : "桌機1P"}倒數中降下、暫停凍結，落盤後才開始計時`, async ({
    page,
  }) => {
    const action = (a: string) => page.locator(`[data-action="${a}"]`);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize(
      local ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    await page.goto("/");
    if (local)
      await page.locator('[data-action="mode"][data-value="local"]').click();
    await action("play").first().click();
    await action("quick").click();
    await action("confirm-team").click();
    if (local) {
      await action("handoff").click();
      await action("quick").click();
      await action("confirm-team").click();
    }
    await action("begin-match").click();
    await page.evaluate(() => document.fonts.ready);
    await page.keyboard.press("Space");
    if (local) {
      await expect(page.locator("#app")).toHaveAttribute(
        "data-screen",
        "launch",
      );
      await page.keyboard.press("Enter");
    }
    const canvas = page.locator("#stage canvas");
    await expect(canvas).toHaveAttribute("data-opening", "hover");
    await expect(page.locator("#battle-time")).toHaveText("0.0 秒");
    await action("pause").first().click();
    const frozenPhase = await canvas.getAttribute("data-opening");
    expect(["hover", "drop", "bounce"]).toContain(frozenPhase);
    const count = await page.locator("#battle-message strong").textContent();
    await page.waitForTimeout(600);
    await expect(canvas).toHaveAttribute("data-opening", frozenPhase!);
    await expect(page.locator("#battle-message strong")).toHaveText(count!);
    await page.locator('#pause-overlay [data-action="pause"]').click();
    await page.screenshot({
      path: local
        ? "artifacts/opening-hover-mobile.png"
        : "artifacts/opening-hover.png",
    });
    if (frozenPhase === "hover") {
      await expect(canvas).toHaveAttribute("data-opening", "drop");
      await expect(page.locator("#battle-time")).toHaveText("0.0 秒");
      await page.screenshot({
      path: local
        ? "artifacts/opening-drop-mobile.png"
        : "artifacts/opening-drop.png",
      });
    }
    await expect(page.locator("#app")).toHaveAttribute(
      "data-screen",
      "battle",
      { timeout: 12000 },
    );
    await expect(canvas).toHaveAttribute("data-opening", "none");
    await expect
      .poll(async () =>
        parseFloat(await page.locator("#battle-time").innerText()),
      )
      .toBeGreaterThan(0.2);
    await page.screenshot({
      path: local
        ? "artifacts/opening-landed-mobile.png"
        : "artifacts/opening-landed.png",
    });
    expect(errors).toEqual([]);
    const video = page.video();
    await page.close();
    await video!.saveAs(
      local
        ? "artifacts/opening-mobile-v050.webm"
        : "artifacts/opening-v050.webm",
    );
  });
test("減少動態效果省略降下與額外進動，倒數後仍正常開局", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const action = (a: string) => page.locator(`[data-action="${a}"]`);
  await page.goto("/");
  await action("play").first().click();
  await action("quick").click();
  await action("confirm-team").click();
  await action("begin-match").click();
  await page.keyboard.press("Space");
  const canvas = page.locator("#stage canvas");
  await expect(canvas).toHaveAttribute("data-opening", "ready");
  await page.waitForTimeout(2000);
  await expect(canvas).toHaveAttribute("data-opening", "ready");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "battle", {
    timeout: 6000,
  });
});
