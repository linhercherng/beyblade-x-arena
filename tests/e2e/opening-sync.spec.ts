import{test,expect,type Page}from'@playwright/test';import clips from'../../src/countdown-voice-data.json'with{type:'json'};
const lengths=Object.fromEntries(Object.entries(clips).map(([cue,encoded])=>[Buffer.from(encoded,'base64').length/2,Number(cue)]));
async function probe(page:Page,hold=false){await page.addInitScript(({lengths,hold})=>{
 const w=window as any,raf=requestAnimationFrame.bind(window),create=AudioContext.prototype.createBufferSource;w.openingTrace={goAt:null,burstAt:null,oneAt:null,landingAt:null,bounceAt:null};w.allowOpeningGo=!hold;w.pendingOpening=[];
 window.requestAnimationFrame=cb=>raf(t=>{if(document.querySelector('.awaiting-launch')&&!w.allowOpeningGo){w.pendingOpening.push(cb);return;}cb(t);const x=w.openingTrace,c=document.querySelector('#stage canvas')as HTMLElement|null;if(w.openingContext&&c?.dataset.launch==='burst'&&x.burstAt===null)x.burstAt=w.openingContext.currentTime;if(w.openingContext&&c?.dataset.opening==='bounce'&&x.bounceAt===null)x.bounceAt=w.openingContext.currentTime;});
 w.releaseOpening=()=>{w.allowOpeningGo=true;for(const cb of w.pendingOpening.splice(0))raf(cb);};
 AudioContext.prototype.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source),ctx=this;w.openingContext=ctx;source.start=(at=ctx.currentTime)=>{const b=source.buffer,x=w.openingTrace;if(b?.sampleRate===16000&&b.length in lengths){const cue=lengths[b.length];if(cue===0)x.goAt=at;if(cue===1)x.oneAt=at;}if(b&&Math.abs(b.duration-.72)<.0001)x.landingAt=at+.45;start(at);};return source;};
 },{lengths,hold});}
test('發射等待實際GO起音，等待期間不提前閃光或耗掉發射動畫',async({page})=>{
 await page.setViewportSize({width:640,height:480});await probe(page,true);await page.goto('/');await page.locator('[data-action="quick-battle"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).pendingOpening.length)).toBeGreaterThan(0);await page.waitForTimeout(250);
 await expect(page.locator('#stage canvas')).not.toHaveAttribute('data-launch','burst');await expect(page.locator('.launch-streaks')).toHaveCount(0);expect(parseFloat((await page.locator('#battle-time').textContent())!)).toBe(0);expect(await page.evaluate(()=>(window as any).openingTrace.goAt)).toBe(null);
 await page.evaluate(()=>(window as any).releaseOpening());await expect.poll(()=>page.evaluate(()=>(window as any).openingTrace.burstAt)).not.toBe(null);const t=await page.evaluate(()=>(window as any).openingTrace);expect(t.burstAt).toBeGreaterThanOrEqual(t.goAt-.004);expect(t.burstAt-t.goAt).toBeLessThan(.12);
});
test('落盤音與凹碗觸盤動畫共用One的音訊進度',async({page})=>{
 await page.setViewportSize({width:640,height:480});await probe(page);await page.goto('/');await page.locator('[data-action="quick-battle"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).openingTrace.bounceAt)).not.toBe(null);const t=await page.evaluate(()=>(window as any).openingTrace);expect(t.landingAt-t.oneAt).toBeCloseTo(.45,3);expect(Math.abs(t.bounceAt-t.landingAt)).toBeLessThan(.09);
});
test('已落盤後恢復One不重複排入落盤低音',async({page})=>{
 await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.countdownReady)).toBe(true);const duration=await page.evaluate(()=>{const s=(window as any).audioSound;s.countdown(1,true);return s.voicePlayback.accent.source.buffer.duration;});expect(duration).toBeLessThan(.2);
});

test('長畫格的發射相位不重複加上畫格時間，已結束時不補閃光',async({page})=>{
 await page.goto('/tests/fixtures/stadium.html');const phases=await page.evaluate(async()=>{
  const{createBattle}=await import('/src/physics.ts'),{BEYS}=await import('/src/catalog.ts'),a=(window as any).stadiumArena,b=createBattle(BEYS[0],BEYS[11],[{power:.9,lane:1,angle:0},{power:.9,lane:1,angle:0}],7);
  a.launch(b,.4,.25);a.draw(.25,b);const first=a.renderer.domElement.dataset.launch;a.launch(b,.8,.25);a.draw(.25,b);return[first,a.renderer.domElement.dataset.launch];
 });expect(phases).toEqual(['burst','none']);
});
