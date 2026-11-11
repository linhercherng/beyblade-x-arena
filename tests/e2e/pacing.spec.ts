import {test,expect} from '@playwright/test';
test('低幀率下對決時鐘仍跟隨實際經過時間',async({page})=>{
  await page.addInitScript(()=>{
    const request=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>request(()=>{setTimeout(()=>callback(performance.now()),130);});
  });
  const action=(name:string)=>page.locator(`[data-action="${name}"]`);
  await page.goto('/');await action('play').first().click();await action('quick').click();await action('confirm-team').click();await action('begin-match').click();await page.keyboard.press('Space');
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  const initial=Number.parseFloat(await page.locator('#battle-time').innerText());
  await expect.poll(async()=>Number.parseFloat(await page.locator('#battle-time').innerText())-initial,{timeout:5500}).toBeGreaterThanOrEqual(3);
});
