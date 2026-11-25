import { test, expect } from "@playwright/test";
import additions from "../../scripts/catalog-expansion.json" with { type: "json" };

test("10款新版可篩選、中文搜尋、查看各自實物與三段模型，手機可選隊發射", async ({ page }) => {
  const errors: string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  await page.goto("/");
  await page.locator('[data-action="catalog"]').first().click();
  await expect(page.locator(".bey-card")).toHaveCount(93);
  await page.locator('[data-action="line"][data-value="new"]').click();
  await expect(page.locator(".bey-card")).toHaveCount(10);
  await expect(page.locator(".new-bey-label")).toHaveCount(10);
  await expect.poll(()=>page.locator(".bey-card img").evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.screenshot({path:"artifacts/catalog-new-v090.png",fullPage:true});
  for(const bey of additions.products){
    await page.getByRole("searchbox").fill(bey.zhName);
    await expect(page.locator(".bey-card")).toHaveCount(1);
    await page.locator(`[data-action="detail"][data-id="${bey.id}"]`).first().click();
    await expect(page.locator("#detail-stage canvas")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("中文參考譯名");
    await page.getByRole("button",{name:"側面",exact:true}).click();
    await page.waitForTimeout(400);
    await page.screenshot({path:`artifacts/new-${bey.id}-side.png`});
    await page.locator('[data-action="model-explode"]').click();
    await expect(page.locator("#detail-stage canvas")).toHaveAttribute("data-assembly","exploded");
    if(bey.id==="bx-00-storm-pegasus"){
      await page.getByRole("button",{name:"底部",exact:true}).click();
      await page.waitForTimeout(400);
      await page.screenshot({path:"artifacts/new-ra-bottom-v090.png"});
    }
    await page.keyboard.press("Escape");
  }
  await page.getByRole("searchbox").fill("");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"artifacts/catalog-new-mobile-v090.png",fullPage:true});
  await page.locator('[data-action="play"]').first().click();
  await page.locator('[data-action="line"][data-value="new"]').click();
  for(const bey of additions.products.slice(0,3))await page.locator(`[data-action="select"][data-id="${bey.id}"]`).click();
  await page.locator('[data-action="confirm-team"]').click();
  await page.locator('[data-action="begin-match"]').click();
  await expect(page.locator(".fighter-0")).toContainText(additions.products[0].zhName);
  await page.keyboard.press("Space");
  await expect(page.locator("#app")).toHaveAttribute("data-screen","battle",{timeout:15000});
  await page.screenshot({path:"artifacts/new-beys-battle-v090.png"});
  expect(errors).toEqual([]);
});
