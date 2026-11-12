import { test, expect } from "@playwright/test";

test("原廠配色、側面厚度與三段拆解在桌機和手機可使用", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "warning" && m.text().includes("THREE."))
      errors.push(m.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.locator('[data-action="catalog"]').first().click();
  for (const name of [
    "Dran Sword",
    "Phoenix Wing",
    "Wizard Rod",
    "Dran Brave Slash",
    "Bullet Griffon",
    "Pegasus Blast Assault",
  ]) {
    await page.getByRole("searchbox").fill(name);
    await page
      .getByRole("button", {
        name: new RegExp(`查看.*${name}.*資訊`),
        exact: true,
      })
      .click();
    await expect(page.locator("#detail-stage canvas")).toBeVisible();
    await expect(page.locator(".model-references")).toContainText(
      "依原廠組合配色",
    );
    await page.getByRole("button", { name: "側面", exact: true }).click();
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `artifacts/model-${name.replaceAll(" ", "-")}-side.png`,
    });
    await page.locator('[data-action="model-explode"]').click();
    await expect(page.locator("#detail-stage canvas")).toHaveAttribute(
      "data-assembly",
      "exploded",
    );
    await expect(page.locator('[data-action="model-explode"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `artifacts/model-${name.replaceAll(" ", "-")}-exploded.png`,
    });
    await page.getByRole("button", { name: "底部", exact: true }).click();
    await page.waitForTimeout(400);
    if (name === "Dran Sword")
      await page.screenshot({ path: "artifacts/model-Dran-Sword-bottom.png" });
    for (const src of await page
      .locator(".model-references img")
      .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")!)))
      expect((await page.request.get(src)).ok()).toBe(true);
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("searchbox").fill("Dran Sword");
  await page
    .getByRole("button", { name: /查看.*Dran Sword.*資訊/, exact: true })
    .click();
  await page.locator('[data-action="model-explode"]').click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator('[data-action="model-explode"]')).toBeInViewport();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "artifacts/model-mobile-exploded.png" });
  expect(errors).toEqual([]);
});
