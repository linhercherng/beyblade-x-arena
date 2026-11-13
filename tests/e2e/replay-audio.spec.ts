import{test,expect,type Page}from'@playwright/test';import{writeFileSync}from'node:fs';
const metrics=(p:Page)=>p.evaluate(()=>(window as any).replayAudioMetrics());
test('定格壓低並收窄配樂，強調音在前景，同階段不重播或重建音源',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tests/fixtures/replay-audio.html');await page.locator('#begin').click();await expect.poll(async()=>(await metrics(page)).playing).toBe('results');await page.waitForTimeout(650);const track=await metrics(page);expect(track.cache).toBe(2);
 await page.locator('#impact').click();await expect.poll(async()=>(await metrics(page)).peakSfx).toBeGreaterThan(.02);await expect.poll(async()=>(await metrics(page)).cutoff).toBeLessThan(1100);const hit=await metrics(page);expect(hit.mix).toBeLessThan(track.mix);expect(hit.peakSfx).toBeGreaterThan(hit.musicAtPeak*1.5);expect(hit.peakMix).toBeLessThan(.95);const count=hit.created;
 await page.locator('#impact').click();await page.waitForTimeout(60);expect((await metrics(page)).created).toBe(count);
 await page.locator('#decision').click();await expect.poll(async()=>(await metrics(page)).cutoff).toBeLessThan(800);await expect.poll(async()=>(await metrics(page)).peakSfx).toBeGreaterThan(.02);const decision=await metrics(page);expect(decision.played).toBe(2);expect(decision.impacts).toBeLessThanOrEqual(6);expect(decision.peakSfx).toBeGreaterThan(decision.musicAtPeak*1.5);expect(decision.peakMix).toBeLessThan(.95);
 await page.locator('#finish').click();await expect.poll(async()=>(await metrics(page)).mix).toBeGreaterThan(.5);const finish=await metrics(page);expect(finish.cueRates[0]).toBeCloseTo(.55,4);expect(finish.cutoff).toBeGreaterThan(12000);expect(finish.offset).toBe(track.offset);expect(errors).toEqual([]);
 writeFileSync('artifacts/replay-audio-mix-v0170.json',JSON.stringify({track,hit,decision,finish},null,2));
});
test('鏡位左右聲道平滑追蹤，跳過取消尾音並立即恢復原配樂',async({page})=>{
 await page.goto('/tests/fixtures/replay-audio.html');await page.locator('#begin').click();await page.locator('#decision').click();await page.locator('#left').click();await expect.poll(async()=>(await metrics(page)).accentPan??0).toBeLessThan(-.3);
 await page.locator('#finish').click();await page.locator('#right').click();await expect.poll(async()=>(await metrics(page)).cuePans[0]??0).toBeGreaterThan(.3);
 await page.locator('#skip').click();await expect.poll(async()=>(await metrics(page)).mix).toBe(1);await expect.poll(async()=>(await metrics(page)).duck).toBeGreaterThan(.97);const m=await metrics(page);expect(m.cues+m.impacts+m.tails+m.dashes).toBe(0);expect(m.cutoff).toBeGreaterThan(20000);expect(m.peakMix).toBeLessThan(.95);
});
test('暫停、靜音不留下強調音，恢復同一次定格不補播舊撞擊',async({page})=>{
 await page.goto('/tests/fixtures/replay-audio.html');await page.locator('#begin').click();await page.locator('#impact').click();await page.locator('#pause').click();await expect.poll(async()=>(await metrics(page)).impacts).toBe(0);const count=(await metrics(page)).created;
 await page.locator('#pause').click();await page.waitForTimeout(70);const resumed=await metrics(page);expect(resumed.played).toBe(1);expect(resumed.accent).toBe(false);expect(resumed.created-count).toBeLessThanOrEqual(1);
 await page.locator('#decision').click();await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).impacts).toBe(0);await page.locator('#mute').click();await page.waitForTimeout(60);expect((await metrics(page)).accent).toBe(false);await page.locator('#skip').click();expect((await metrics(page)).stage).toBe(null);
});
