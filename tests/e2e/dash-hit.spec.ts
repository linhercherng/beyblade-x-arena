import{test,expect,type Page}from'@playwright/test';
const fixture='/tests/fixtures/dash-hit.html'+(process.env.CI?'?software-gpu':'');
import{writeFileSync}from'node:fs';
const metrics=(p:Page,withBounds=true)=>p.evaluate(bounds=>(window as any).hitMetrics(bounds),withBounds);
test('衝刺命中慢動作、近鏡及衝擊環，暫停精確凍結且恢復正常',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:800});await page.goto(fixture);
 await page.locator('#capture').click();const m=await metrics(page);expect(m.accepted).toBe(1);expect(m.sample.scale).toBeLessThan(.3);expect(m.ring.visible).toBe(true);expect(m.distance).toBeLessThan(m.baseline);
 expect(m.corners.every((v:number[])=>Math.abs(v[0])<1&&Math.abs(v[1])<1&&v[2]>-1&&v[2]<1)).toBe(true);
 await page.screenshot({path:'artifacts/dash-hit-v0130.png'});await page.waitForTimeout(170);const frozen=await metrics(page);expect(frozen.time).toBe(m.time);expect(frozen.camera).toEqual(m.camera);expect(frozen.ring).toEqual(m.ring);
 await page.locator('#pause').click();await expect.poll(async()=>(await metrics(page)).sample.scale).toBe(1);await expect.poll(async()=>(await metrics(page)).ring.visible).toBe(false);expect(errors).toEqual([]);
});
test('命中音效在最大配樂前景，暫停及靜音取消尾音，終結優先',async({page})=>{
 const audioMetrics=()=>metrics(page,false);await page.goto(fixture+(process.env.CI?'&audio-only':''));await page.locator('#bgm').click();await page.locator('#normal').click();await expect.poll(async()=>(await audioMetrics()).playing).toBe('battle');await page.waitForTimeout(650);
 await page.locator('#play').click();const priority=await audioMetrics();expect(priority.renderProfile.audioOnly).toBe(!!process.env.CI);writeFileSync(process.env.CI?'artifacts/dash-hit-priority-software-v0430.json':'artifacts/dash-hit-priority-native-v0430.json',JSON.stringify(priority,null,2));expect(priority.impactRates.some((r:number)=>Math.abs(r-.8)<.001)).toBe(true);await expect.poll(async()=>(await audioMetrics()).peakSfx).toBeGreaterThan(.02);const m=await audioMetrics();expect(m.peakSfx).toBeGreaterThan(m.musicAtPeak*1.5);expect(m.peakMix).toBeLessThan(.95);
 await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('#play')!.click();document.querySelector<HTMLButtonElement>('#pause')!.click();});const cancellation=()=>page.evaluate(()=>(window as any).hitPauseCancellation());expect((await cancellation()).active).toBeGreaterThan(0);await expect.poll(async()=>{const p=await cancellation();return p.stopped===p.active&&p.remaining===0;}).toBe(true);
 await page.locator('#play').click();await page.locator('#mute').click();expect((await audioMetrics()).impacts).toBe(0);
 await page.locator('#play').click();await page.locator('#finish').click();const f=await audioMetrics();expect(f.sample.scale).toBe(1);await expect.poll(async()=>(await audioMetrics()).ring.visible).toBe(false);
 writeFileSync('artifacts/dash-hit-audio-v0130.json',JSON.stringify(m,null,2));
});
test('手機持續密集命中幀時間及資源有界，近鏡不裁切陀螺',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto(fixture);await page.locator('#capture').click();const c=await metrics(page);expect(c.corners.every((v:number[])=>Math.abs(v[0])<1&&Math.abs(v[1])<1)).toBe(true);
 await page.screenshot({path:'artifacts/dash-hit-mobile-v0130.png'});await page.waitForTimeout(400);await page.locator('#rapid').click();if(process.env.CI)await expect.poll(()=>page.evaluate(()=>(window as any).hitProgress().remaining),{timeout:30000}).toBe(0);else await page.waitForTimeout(3100);const m=await metrics(page),frames=m.frames.slice(20).sort((a:number,b:number)=>a-b);expect(m.accepted).toBeGreaterThanOrEqual(2);expect(m.accepted).toBeLessThanOrEqual(4);expect(m.particles).toBeLessThanOrEqual(360);expect(m.impacts).toBeLessThanOrEqual(6);expect(m.geometryStable).toBe(true);expect(m.peakMix).toBeLessThan(.95);expect(frames.length).toBeGreaterThan(30);expect(m.renderProfile.softwareGpu).toBe(!!process.env.CI);expect(frames.every((n:number)=>Number.isFinite(n)&&n>0)).toBe(true);if(!process.env.CI)expect(frames[Math.floor(frames.length*.95)]).toBeLessThan(100);
 writeFileSync(process.env.CI?'artifacts/dash-hit-software-v0430.json':'artifacts/dash-hit-mobile-performance-v0130.json',JSON.stringify({profile:m.renderProfile,samples:frames.length,median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],accepted:m.accepted,geometryStable:m.geometryStable,peakMix:m.peakMix},null,2));expect(errors).toEqual([]);
});
test('減少動態省略慢動作、拉鏡及衝擊環；全場選擇不被近鏡覆寫',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(fixture);await page.locator('#capture').click();const m=await metrics(page);expect(m.sample).toEqual({scale:1,zoom:0,shock:0});expect(m.ring.visible).toBe(false);expect(m.particles).toBeLessThanOrEqual(8);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await page.locator('#whole').click();await page.locator('#capture').click();const w=await metrics(page);expect(w.distance).toBeGreaterThan(14);
});
