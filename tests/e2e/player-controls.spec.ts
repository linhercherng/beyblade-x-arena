import {test,expect} from '@playwright/test';

for(const width of [320,390,844,1280,1440])test(`${width}px雙人發射及呼喊固定1P左2P右且各自可操作`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width===844?390:900});
  const action=(a:string)=>page.locator(`[data-action="${a}"]`);
  await page.goto('/');await page.locator('[data-action="mode"][data-value="local"]').click();
  await action('play').first().click();await action('quick').click();await action('confirm-team').click();
  await action('handoff').click();await action('quick').click();await action('confirm-team').click();await action('begin-match').click();
  const panels=page.locator('.launch-controls');
  const boxes=await panels.evaluateAll(nodes=>nodes.map(n=>{
    const r=n.getBoundingClientRect();
    return {x:r.x,y:r.y,right:r.right,controls:[...n.querySelectorAll('button,input,select')].map(c=>{const b=c.getBoundingClientRect();return{x:b.x,right:b.right};})};
  }));
  expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(2);
  expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].x);
  for(const b of boxes)for(const c of b.controls){expect(c.x).toBeGreaterThanOrEqual(b.x);expect(c.right).toBeLessThanOrEqual(b.right);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('2P 傾斜方向').selectOption('1');await expect(page.getByLabel('1P 傾斜方向')).toHaveValue('0');
  await panels.nth(1).locator('[data-action="lane"][data-value="2"]').click();
  await expect(panels.nth(0).locator('[data-action="lane"][data-value="1"]')).toHaveClass(/selected/);
  await page.screenshot({path:`artifacts/player-launch-${width}-v0201.png`,fullPage:true});
  await page.locator('h1').click();await page.keyboard.press('Space');
  await expect(page.getByLabel('1P 傾斜方向')).toBeDisabled();await expect(page.getByLabel('2P 傾斜方向')).toBeEnabled();
  await page.locator('[data-action="lock"][data-player="1"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  const shouts=await page.locator('#shout-0,#battle-time,#shout-1').evaluateAll(nodes=>nodes.map(n=>({id:n.id,...n.getBoundingClientRect().toJSON()})));
  const left=shouts.find(n=>n.id==='shout-0')!,right=shouts.find(n=>n.id==='shout-1')!,clock=shouts.find(n=>n.id==='battle-time')!;
  expect(left.x+left.width/2).toBeLessThan(width/2);expect(right.x+right.width/2).toBeGreaterThan(width/2);
  expect(left.right).toBeLessThanOrEqual(clock.x);expect(clock.right).toBeLessThanOrEqual(right.x);
  expect(left.height).toBeGreaterThanOrEqual(44);expect(right.height).toBeGreaterThanOrEqual(44);
  await page.locator('#shout-1').click();await expect(page.locator('#shout-1')).toBeDisabled();await expect(page.locator('#shout-0')).toBeEnabled();
  await page.screenshot({path:`artifacts/player-battle-${width}-v0201.png`});
  expect(errors).toEqual([]);
});
