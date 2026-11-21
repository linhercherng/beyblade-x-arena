import{test,expect}from'@playwright/test';

for(const width of[320,390,1440])test(`${width}px已發售V2資料可查閱，刃片不虛構組合且選隊不誤選新版`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:900});await page.goto('/');
 await page.locator('[data-action="catalog"]').first().click();
 await expect(page.locator('.bey-card')).toHaveCount(91);
 await page.getByRole('searchbox').fill('V2');await expect(page.locator('.bey-card')).toHaveCount(2);
 for(const[id,name]of[['bx-01-dran-sword','蒼龍神劍 V2'],['bx-02-hells-scythe','惡魔紅鐮 V2']]){
  await page.locator(`[data-action="detail"][data-id="${id}"]`).first().click();
  const panel=page.getByRole('region',{name:'已發售V2改版資料'});
  await expect(panel).toContainText(name);await panel.scrollIntoViewIfNeeded();
  await expect(panel).toContainText('仍使用原版');
  await expect(panel).toContainText(id==='bx-01-dran-sword'?'BX-00':'CX-20');
  await expect.poll(()=>panel.locator('img').evaluateAll(ns=>ns.every(n=>(n as HTMLImageElement).naturalWidth>0))).toBe(true);
  await expect(panel.getByRole('link',{name:'V2原廠商品資料'})).toHaveAttribute('href',/^https:\/\/beyblade\.takaratomy\.co\.jp\//);
  if(id==='bx-02-hells-scythe'){await expect(panel).toContainText('僅刃片');await expect(panel).not.toContainText('4-60T');}
  await page.screenshot({path:`artifacts/revision-${id}-${width}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 }
 await page.getByRole('searchbox').fill('2.0');await expect(page.locator('.bey-card')).toHaveCount(2);
 await page.getByRole('searchbox').fill('BX-00');await expect(page.locator('[data-action="detail"][data-id="bx-01-dran-sword"]').first()).toBeVisible();
 await page.getByRole('searchbox').fill('UX-22');await expect(page.locator('.bey-card')).toHaveCount(0);
 await page.locator('[data-action="play"]').first().click();
 await expect(page.locator('.bey-card')).toHaveCount(91);
 await page.getByRole('searchbox').fill('V2');await expect(page.locator('.bey-card')).toHaveCount(0);
 expect(errors).toEqual([]);
});
