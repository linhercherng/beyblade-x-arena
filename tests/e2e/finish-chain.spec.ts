import{test,expect,type Page}from'@playwright/test';import{writeFileSync}from'node:fs';
const metrics=(page:Page)=>page.evaluate(()=>(window as any).chainMetrics());
for(const mobile of [false,true])test(`${mobile?'手機':'桌機'}衝刺命中接三種終結保留鏡位，暫停不跳動且落點穩定`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize(mobile?{width:390,height:844}:{width:1200,height:800});await page.goto('/tests/fixtures/finish-chain.html');
 for(const kind of ['burst','over','extreme']){
  await page.locator('#'+kind).click();const m=await metrics(page);expect(m.rate).toBeGreaterThanOrEqual(.35);expect(m.rate).toBeLessThan(1);expect(m.cached).toBe(true);expect(m.camera).toEqual(m.beforeCamera);expect(m.focus).toEqual(m.beforeFocus);
  await page.locator('#step').click();const step=await metrics(page);expect(step.elapsed).toBeLessThan(step.age);expect(step.bounds.every((v:number[])=>Math.abs(v[0])<1&&Math.abs(v[1])<1)).toBe(true);
  await page.screenshot({path:`artifacts/chain-${kind}-${mobile?'mobile':'desktop'}-v0140.png`});await page.waitForTimeout(140);expect((await metrics(page)).camera).toEqual(step.camera);expect((await metrics(page)).positions).toEqual(step.positions);
  for(let i=0;i<4;i++){await page.locator('#step').click();expect((await metrics(page)).bounds.every((v:number[])=>Math.abs(v[0])<1&&Math.abs(v[1])<1)).toBe(true);}
  await page.locator('#end').click();const end=await metrics(page);if(kind==='over')expect(end.positions[1][0]).toBeGreaterThan(5.4);if(kind==='extreme')expect(end.positions[1][2]).toBeCloseTo(5.65,2);if(kind==='burst')expect(new Set(end.parts[1].map((p:number[])=>p.join())).size).toBe(3);expect(end.bounds.every((v:number[])=>Math.abs(v[0])<1&&Math.abs(v[1])<1)).toBe(true);expect(end.stable).toBe(true);expect(end.ringStable).toBe(true);
 }
 await page.locator('#terminal').click();expect((await metrics(page)).rate).toBeLessThan(1);expect(errors).toEqual([]);
});
test('終結音效從慢速恢復、交叉淡化，暫停與靜音取消殘留尾音',async({page})=>{
 await page.goto('/tests/fixtures/finish-chain.html');await page.locator('#extreme').click();const start=await metrics(page);expect(start.rate).toBeLessThan(1);expect(start.cached).toBe(true);await expect.poll(async()=>(await metrics(page)).peak).toBeGreaterThan(.01);await expect.poll(async()=>(await metrics(page)).cueRates[0]??1).toBe(1);expect((await metrics(page)).peak).toBeLessThan(.95);
 await page.locator('#extreme').click();await page.locator('#pause').click();await expect.poll(async()=>(await metrics(page)).cues).toBe(0);expect((await metrics(page)).tails).toBe(0);
 await page.locator('#burst').click();await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).cues).toBe(0);expect((await metrics(page)).tails).toBe(0);
});
test('減少動態不啟用慢速交接，全場選擇保留；手機實際幀間隔及粒子有界',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/tests/fixtures/finish-chain.html');await page.locator('#burst').click();expect((await metrics(page)).rate).toBe(1);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#whole').click();await page.locator('#burst').click();const whole=await metrics(page);expect(Math.hypot(...whole.camera)).toBeGreaterThan(15);
 await page.locator('#play').click();await page.waitForTimeout(1650);const m=await metrics(page),frames=m.frames.slice(8).sort((a:number,b:number)=>a-b);expect(frames.length).toBeGreaterThan(35);expect(frames[Math.floor(frames.length*.95)]).toBeLessThan(100);expect(m.particles).toBeLessThanOrEqual(360);expect(m.ringStable).toBe(true);expect(m.peak).toBeLessThan(.95);
 writeFileSync('artifacts/finish-chain-performance-v0140.json',JSON.stringify({samples:frames.length,median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],peak:m.peak,geometryCount:m.geometryCount,stable:m.stable},null,2));
});
