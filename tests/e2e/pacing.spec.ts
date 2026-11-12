import {test,expect} from '@playwright/test';
test('低幀率下對決時鐘仍跟隨實際經過時間',async({page})=>{
  await page.addInitScript(()=>{
    const request=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>request(()=>{setTimeout(()=>callback(performance.now()),130);});
  });
  const action=(name:string)=>page.locator(`[data-action="${name}"]`);
  await page.goto('/');await action('play').first().click();await action('quick').click();await action('confirm-team').click();await action('begin-match').click();await page.keyboard.press('Space');
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  await expect(page.locator('#battle-phase')).toContainText('開場穩定期');
  const initial=Number.parseFloat(await page.locator('#battle-time').innerText());
  await expect.poll(async()=>Number.parseFloat(await page.locator('#battle-time').innerText())-initial,{timeout:5500}).toBeGreaterThanOrEqual(3);
});

test('新節奏規則可見，手機時鐘標示不溢出', async ({page}) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:'遊戲規則',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('15–40 秒');
  await expect(page.getByRole('dialog')).toContainText('30 秒後增加雙方耗轉');
  await page.getByRole('button',{name:'準備好了 →'}).click();
  for (const name of ['play','quick','confirm-team','begin-match']) await page.locator(`[data-action="${name}"]`).first().click();
  await page.keyboard.press('Space');
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  await expect(page.locator('#battle-phase')).toContainText('開場穩定期');
  expect(await page.locator('.battle-clock').evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/pacing-mobile-v091.png'});
  expect(errors).toEqual([]);
});
