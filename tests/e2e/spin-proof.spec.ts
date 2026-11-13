import{test,expect}from'@playwright/test';
test('6款陀螺不再顯示推定，手機詳細資料可查看逐款原廠旋向來源',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('[data-action="catalog"]').first().click();
 const cases=[['cx-00-valkyrie-volt-slash','cx00-vv','atack'],['cx-00-bucks-antlers-bumper','cx00-ba','defense'],['cx-00-kraken-wriggle-slash','cx00-kw','stamina'],['cx-00-hornet-fort-round','cx00-hf','balance'],['cx-00-drake-brave-gravity','cx00-drb','atack'],['bx-00-storm-spriggan','bx00-ss','balance']];
 for(const[id,product,icon]of cases){await page.locator(`[data-action="detail"][data-id="${id}"]`).first().click();const dialog=page.getByRole('dialog'),proof=dialog.locator('.spin-proof');await expect(dialog.locator('.spin-badge')).toHaveText('↻ 右迴旋');await expect(proof).toContainText('旋向原廠核對');await expect(proof.getByRole('link',{name:'商品頁 ↗'})).toHaveAttribute('href',`https://beyblade.takaratomy.co.jp/beyblade-x/lineup/${product}.html`);await expect(proof.getByRole('link',{name:'R／ミギカイテン圖示 ↗'})).toHaveAttribute('href',`https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/icon_${icon}@2x.png`);expect(await dialog.innerText()).not.toContain('右旋依');
  if(product==='bx00-ss'){await proof.scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/spin-proof-mobile-v0191.png'});}await page.getByRole('button',{name:'關閉卡牌'}).click();
 }
});
