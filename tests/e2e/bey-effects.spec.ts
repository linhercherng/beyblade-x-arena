import{test,expect}from'@playwright/test';import{writeFileSync}from'node:fs';
const fixture='/tests/fixtures/bey-effects.html'+(process.env.CI?'?software-gpu':'');
const metrics=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).effectMetrics());
test('依陀螺特性顯示掃刃、護環、氣流與切換，暫停穩定且不改物理',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize(process.env.CI?{width:640,height:480}:{width:1200,height:800});await page.goto(fixture);
 for(const pair of ['attack','defense','balance','special']){await page.locator('#'+pair).click();await page.locator('#hit').click();const m=await metrics(page);expect(m.rings.every((r:any)=>r.visible)).toBe(true);expect(m.rings[0].color).not.toBe(m.rings[1].color);expect(m.stable).toBe(true);expect(m.particles).toBeLessThanOrEqual(360);expect(m.calls).toBeLessThan(140);
 if(pair==='defense'){expect(m.rings.map((r:any)=>r.mode)).toEqual(['defense','stamina']);expect(m.waves).toEqual(['triangle','sine']);}
 if(pair==='balance'){expect(m.rings[0].mode).toBe('defense');await page.locator('#switch').click();await expect.poll(async()=>(await metrics(page)).rings[0].mode).toBe('attack');}
 if(pair==='special'){expect(m.profiles[0].rubber).toBe(true);expect(m.profiles[1].free).toBe(true);}
 await page.screenshot({path:`artifacts/bey-effects-${pair}-v0260.png`});const frozen=(await metrics(page)).rings;await page.waitForTimeout(100);expect((await metrics(page)).rings).toEqual(frozen);expect(await page.evaluate(()=>(window as any).effectsDoNotMutate())).toBe(true);
 }expect(errors).toEqual([]);
});
test('手機特性效果幾何與粒子有界，減少動態停用附加光環',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(fixture);await page.locator('#special').click();await expect.poll(async()=>(await metrics(page)).frames.length,{timeout:process.env.CI?30000:10000}).toBeGreaterThan(45);const m=await metrics(page),frames=m.frames.slice(12).sort((a:number,b:number)=>a-b);expect(m.renderProfile.softwareGpu).toBe(!!process.env.CI);expect(frames.every((n:number)=>Number.isFinite(n)&&n>0)).toBe(true);if(!process.env.CI)expect(frames[Math.floor(frames.length*.95)]).toBeLessThan(100);expect(m.stable).toBe(true);writeFileSync(process.env.CI?'artifacts/bey-effects-software-v0430.json':'artifacts/bey-effects-mobile-v0260.json',JSON.stringify({profile:m.renderProfile,calls:m.calls,samples:frames.length,p95:frames[Math.floor(frames.length*.95)]}));
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('#hit').click();expect((await metrics(page)).rings.every((r:any)=>!r.visible)).toBe(true);expect((await metrics(page)).particles).toBeLessThanOrEqual(8);
});
test('One落盤尾音在語音結束後仍可被暫停清除，不殘留補播',async({page})=>{
 await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.countdownReady)).toBe(true);
 await page.evaluate(()=>{const s=(window as any).audioSound;s.countdown(1);});
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).audioSound;return s.voicePlayback?.complete===true&&!!s.voicePlayback?.accent;}),{intervals:[5]}).toBe(true);
 await page.locator('#pause').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.voicePlayback)).toBe(null);await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).audioSound.sources.size)).toBeLessThanOrEqual(1);
});
