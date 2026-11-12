import{test,expect}from'@playwright/test';
import{writeFileSync}from'node:fs';
const metrics=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).dashMetrics());
test('齒軌咬合亮點、釋放拖尾、暫停精確且不改動物理狀態',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1200,height:800});await page.goto('/tests/fixtures/dash.html');
  await page.locator('#latch').click();const latch=await metrics(page);
  expect(latch.flashes).toBeGreaterThan(0);expect(Math.hypot(latch.model[0][0],latch.model[0][2])).toBeGreaterThan(3.7);
  await page.screenshot({path:'artifacts/dash-latch-v0120.png'});
  await page.reload();await page.locator('#capture').click();await page.locator('#dash').click();
  const frozen=await metrics(page);expect(frozen.ribbons[0].visible).toBe(true);expect(frozen.ribbons[0].count).toBeGreaterThan(20);
  await page.screenshot({path:'artifacts/dash-ribbon-v0120.png'});await page.waitForTimeout(150);
  const still=await metrics(page);expect(still.time).toBe(frozen.time);expect(still.ribbons).toEqual(frozen.ribbons);expect(still.quaternion).toEqual(frozen.quaternion);
  expect(await page.evaluate(()=>(window as any).drawDoesNotMutate())).toBe(true);
  await page.locator('#pause').click();await expect.poll(async()=>(await metrics(page)).ribbons[0].visible).toBe(false);
  expect((await metrics(page)).geometryStable).toBe(true);expect(errors).toEqual([]);
});
test('齒鳴與風切在最大配樂前景可辨，暫停及靜音會取消衝刺聲',async({page})=>{
  await page.goto('/tests/fixtures/dash.html');await page.locator('#bgm').click();
  await expect.poll(async()=>(await metrics(page)).playing).toBe('battle');await page.waitForTimeout(650);
  await page.locator('#both').click();await expect.poll(async()=>(await metrics(page)).peakSfx).toBeGreaterThan(.01);
  const m=await metrics(page);expect(m.peakSfx).toBeGreaterThan(m.musicAtPeak*1.5);expect(m.peakMix).toBeLessThan(.95);expect(m.duck).toBeLessThan(.8);
  await page.locator('#pause').click();await expect.poll(async()=>(await metrics(page)).voices).toBe(0);
  await page.waitForTimeout(150);await page.locator('#dash').click();await expect.poll(async()=>(await metrics(page)).voices).toBeGreaterThan(0);
  await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).voices).toBe(0);await expect.poll(async()=>(await metrics(page)).rms).toBeLessThan(.0005);
  writeFileSync('artifacts/dash-audio-v0120.json',JSON.stringify(m,null,2));
});
test('手機密集衝刺與碰撞不重建幾何，粒子及音訊聲部有界',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});
  await page.goto('/tests/fixtures/dash.html');await page.locator('#rapid').click();const m=await metrics(page);
  expect(m.particles).toBeLessThanOrEqual(360);expect(m.voices).toBeLessThanOrEqual(2);expect(m.ribbons.every((r:any)=>r.count<=180)).toBe(true);
  await page.waitForTimeout(2200);const done=await metrics(page);expect(done.geometryStable).toBe(true);expect(done.peakMix).toBeLessThan(.95);
  const frames=done.frames.slice(20).sort((a:number,b:number)=>a-b);expect(frames.length).toBeGreaterThan(30);expect(frames[Math.floor(frames.length*.95)]).toBeLessThan(100);
  writeFileSync('artifacts/dash-mobile-performance-v0120.json',JSON.stringify({calls:done.calls,samples:frames.length,medianFrameMs:frames[Math.floor(frames.length*.5)],p95FrameMs:frames[Math.floor(frames.length*.95)],geometryStable:done.geometryStable,peakMix:done.peakMix},null,2));expect(errors).toEqual([]);
});
test('減少動態停用貼軌偏移、拖尾和閃光，保留少量接觸提示',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
  await page.goto('/tests/fixtures/dash.html');await page.locator('#latch').click();const m=await metrics(page);
  expect(m.flashes).toBe(0);expect(m.ribbons.every((r:any)=>!r.visible)).toBe(true);expect(m.particles).toBeLessThanOrEqual(4);expect(Math.hypot(m.model[0][0],m.model[0][2])).toBeCloseTo(3.325,3);
});

test('出口空隙只呈現加速，不把咬合火花放在不存在的齒軌',async({page})=>{
  await page.goto('/tests/fixtures/dash.html');await page.locator('#gap').click();
  const m=await metrics(page);expect(m.flashes).toBe(0);expect(m.particles).toBe(0);
});
