import{test,expect,type Page}from'@playwright/test';import clips from'../../src/countdown-voice-data.json' with{type:'json'};
const lengths=Object.fromEntries(Object.entries(clips).map(([cue,data])=>[Buffer.from(data,'base64').length/2,Number(cue)]));
async function probe(page:Page,delay=false,gap=true){await page.addInitScript(({lengths,delay,gap})=>{
 const w=window as any,request=requestAnimationFrame.bind(window),create=AudioContext.prototype.createBufferSource;w.launchCalls=[];w.launchEnds=[];w.launchCuts=[];w.heldLaunchFrames=[];w.holdLaunch=false;
 window.requestAnimationFrame=cb=>request(t=>{if(w.holdLaunch)w.heldLaunchFrames.push(cb);else cb(t);});w.releaseLaunchGap=()=>{w.holdLaunch=false;for(const cb of w.heldLaunchFrames.splice(0))request(cb);};
 AudioContext.prototype.createBufferSource=function(){const ctx=this,s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let cue:number|undefined,end=Infinity,cut=false;
  s.start=(at=ctx.currentTime)=>{if(s.buffer?.sampleRate===16000&&s.buffer.length in lengths){cue=lengths[s.buffer.length];if(cue===3&&delay)at+=1.2;if(cue===w.delayedCue)at+=.5;end=at+s.buffer.duration;w.launchCalls.push({cue,text:document.querySelector('#battle-message')?.textContent,at});if(cue===3&&gap&&!delay)w.holdLaunch=true;}start(at);};
  s.stop=(at=ctx.currentTime)=>{if(cue!==undefined&&at<end-.005&&!cut){cut=true;w.launchCuts.push(cue);}stop(at);};s.addEventListener('ended',()=>{if(cue!==undefined)w.launchEnds.push(cue);});return s;};
 },{lengths,delay,gap});}
for(const mode of ['cpu','local'])test(`${mode}冷啟動與兩秒畫格空窗仍依序完整播報並對應畫面`,async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page);await page.goto('/');if(mode==='local')await page.locator('[data-action="mode"][data-value="local"]').click();await page.locator('[data-action="quick-battle"]').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).heldLaunchFrames.length)).toBeGreaterThan(0);await page.waitForTimeout(2200);await expect(page.locator('.count-beat')).toHaveText('3');await page.evaluate(()=>(window as any).releaseLaunchGap());
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds)).toEqual([3,2,1,0]);
 const state=await page.evaluate(()=>({calls:(window as any).launchCalls,cuts:(window as any).launchCuts}));console.log('Cold launch',JSON.stringify(state));expect(state.calls.map((c:any)=>c.cue)).toEqual([3,2,1,0]);expect(state.cuts).toEqual([]);for(const c of state.calls)expect(c.text).toContain(c.cue===0?'GO SHOOT!':String(c.cue));
});
test('首拍聲源啟動延後仍等整句結束，不以牆上秒數截斷',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page,true);await page.goto('/');await page.locator('[data-action="quick-battle"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds)).toEqual([3,2,1,0]);expect(await page.evaluate(()=>(window as any).launchCuts)).toEqual([]);
});
test('暫停與背景恢復只重新完成中斷當拍，不補播完成的數字',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page,false,false);await page.goto('/');await page.evaluate(()=>(window as any).delayedCue=2);await page.locator('[data-action="quick-battle"]').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).launchCalls.at(-1)?.cue),{intervals:[25]}).toBe(2);await page.keyboard.press('Escape');await expect(page.locator('#pause-overlay')).toBeVisible();const count=await page.evaluate(()=>(window as any).launchCalls.length);await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).launchCalls.length)).toBe(count);await page.evaluate(()=>(window as any).delayedCue=1);await page.keyboard.press('Escape');
 await expect.poll(()=>page.evaluate(()=>(window as any).launchCalls.at(-1)?.cue),{intervals:[25]}).toBe(1);await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pageshow'));});await expect(page.locator('#pause-overlay')).toBeVisible();await page.evaluate(()=>(window as any).delayedCue=null);await page.locator('#pause-overlay [data-action="pause"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds.at(-1))).toBe(0);expect(await page.evaluate(()=>(window as any).launchCalls.map((c:any)=>c.cue))).toEqual([3,2,2,1,1,0]);expect(await page.evaluate(()=>(window as any).launchCuts)).toEqual([2,1]);
});
for(const unavailable of [false,true])test(`靜音或無WebAudio也逐拍倒數且可開始對戰 unavailable=${unavailable}`,async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(unavailable=>{if(unavailable)(window as any).AudioContext=undefined;else localStorage.setItem('spinforge-muted','true');},unavailable);await page.goto('/');await page.locator('[data-action="quick-battle"]').click();for(const cue of ['3','2','1'])await expect(page.locator('.count-beat')).toHaveText(cue);await expect(page.locator('.launch-call')).toHaveText('GO SHOOT!');await expect(page.locator('#app')).toHaveAttribute('data-screen','battle');
});
test('零配樂且首字前音訊停鐘時顯示恢復提示，恢復仍完整倒數',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page,false,false);
 await page.addInitScript(()=>{localStorage.setItem('spinforge-music-volume','0');const w=window as any,Original=AudioContext;w.freezeLaunchClock=true;w.AudioContext=class extends Original{get currentTime(){return w.freezeLaunchClock?0:super.currentTime;}};});
 await page.goto('/');await page.locator('[data-action="quick-battle"]').click();await expect(page.locator('#pause-overlay')).toBeVisible();await expect(page.locator('#audio-notice')).toBeVisible();expect(await page.evaluate(()=>(window as any).launchCalls)).toEqual([]);
 await page.evaluate(()=>(window as any).freezeLaunchClock=false);await page.locator('#pause-overlay [data-action="pause"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds)).toEqual([3,2,1,0]);expect(await page.evaluate(()=>(window as any).launchCuts)).toEqual([]);
});
