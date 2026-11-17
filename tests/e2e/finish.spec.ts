import {test,expect} from '@playwright/test';
const metrics=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).finishMetrics());
test('爆裂分離、越界側盤、極限前盤有不同且有限的落點，暫停不漂移',async({page})=>{
 await page.setViewportSize({width:1200,height:800});await page.goto('/tests/fixtures/finish.html');
 for(const kind of ['burst','over','extreme']){
  await page.locator('#capture').click();await page.locator('#'+kind).click();
  const m=await metrics(page);
  if(kind==='burst')expect(new Set(m.parts[1].map((p:number[])=>p.join(','))).size).toBe(3);
  if(kind==='over')expect(m.positions[1][0]).toBeGreaterThan(5.4);
  if(kind==='extreme')expect(m.positions[1][2]).toBeCloseTo(5.65,2);
  await page.screenshot({path:`artifacts/finish-${kind}-v080.png`});
  await page.waitForTimeout(150);expect((await metrics(page)).positions).toEqual(m.positions);
 }
 await page.locator('#capture').click();await page.locator('#integrated').click();
 const integrated=await metrics(page);
 for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)if(integrated.links[1][a]===integrated.links[1][b])
   expect(integrated.parts[1][a]).toEqual(integrated.parts[1][b]);
 await page.locator('#capture').click();await page.locator('#wallburst').click();
 const wall=await metrics(page);
 expect(wall.partMin[1][0]).toBeLessThan(.46);
 expect(wall.partMin[1][0]).toBeGreaterThan(.39);
});
test('凹碗上的停轉光環貼合盤面，接盤光環保留原高度',async({page})=>{
 await page.goto('/tests/fixtures/finish.html');await page.locator('#capture').click();await page.locator('#spin').click();const spin=await metrics(page);expect(spin.pulses[1][1]).toBeLessThan(0);expect(spin.pulses[1][1]).toBeCloseTo(spin.pulses[0][1],2);
 await page.locator('#capture').click();await page.locator('#over').click();expect((await metrics(page)).pulses[1][1]).toBeCloseTo(.115,3);
});

test('終結及勝負音效可播放，暫停及靜音取消尚未結束的演出音效',async({page})=>{
 await page.goto('/tests/fixtures/finish.html?audio-only');await page.locator('#special').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).finishSound.countdownReady)).toBe(true);expect((await metrics(page)).audioOnly).toBe(true);
 for(const kind of ['burst','over','extreme','spin','draw','victory','defeat']){
  await page.locator('#'+kind).click();expect((await metrics(page)).cues).toBeGreaterThan(0);await expect.poll(async()=>(await metrics(page)).peak).toBeGreaterThan(.005);
 }
 await page.locator('#burst').click();await page.locator('#mute').click();
 await expect.poll(async()=>(await metrics(page)).cues).toBe(0);
 await expect.poll(async()=>(await metrics(page)).rms).toBeLessThan(.0001);
 await page.locator('#mute').click();await page.locator('#extreme').click();await page.locator('#pause').click();
 await expect.poll(async()=>(await metrics(page)).cues).toBe(0);
 await expect.poll(async()=>(await metrics(page)).rms).toBeLessThan(.0001);
});
test('減少動態模式直接展示穩定終點，不持續散開或飛走',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/tests/fixtures/finish.html');
 await page.locator('#burst').click();const first=await metrics(page);await page.waitForTimeout(500);
 expect((await metrics(page)).parts).toEqual(first.parts);expect(first.reduced).toBe(true);
});
