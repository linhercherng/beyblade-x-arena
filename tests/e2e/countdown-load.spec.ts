import{test,expect,type Page}from'@playwright/test';import clips from'../../src/countdown-voice-data.json' with{type:'json'};
import{installProbe}from'./audio-probe.ts';import{writeFileSync}from'node:fs';
import{profileGame}from'./game-render-profile.ts';
const gameUrl=process.env.CI?'/?software-gpu&audio-only':'/';
const network=new WeakMap<Page,{pending:Set<import('@playwright/test').Request>;failed:{url:string;error?:string}[];errors:string[]}>();
test.beforeEach(async({page})=>{
 await profileGame(page);
 const state={pending:new Set<import('@playwright/test').Request>(),failed:[]as{url:string;error?:string}[],errors:[]as string[]};network.set(page,state);
 page.on('request',r=>state.pending.add(r));page.on('requestfinished',r=>state.pending.delete(r));page.on('requestfailed',r=>{state.pending.delete(r);state.failed.push({url:r.url(),error:r.failure()?.errorText});});page.on('pageerror',e=>state.errors.push(e.message));
 await installProbe(page);
 await page.addInitScript(()=>{
  const w=window as any,nativeClock=Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'currentTime')!.get!;w.startupSamples=[];
  setInterval(()=>{const ctx=w.audioProbe?.ctx;if(ctx){w.startupSamples.push({wall:performance.now(),clock:ctx.currentTime,nativeClock:nativeClock.call(ctx),state:ctx.state,hidden:document.hidden});if(w.startupSamples.length>300)w.startupSamples.shift();}},100);
 });
});
test.afterEach(async({page},info)=>{
 if(process.env.CI){const profiles=await page.evaluate(()=>(window as any).gameRenderProfiles?.map((info:()=>unknown)=>info())??[]);await info.attach('game-render-profile',{body:JSON.stringify({scope:'model-phase-native-audio-clock-only',profiles}),contentType:'application/json'});if(info.status===info.expectedStatus){expect(profiles.length).toBeGreaterThan(0);expect(profiles.every((p:any)=>p.softwareGpu&&p.audioOnly)).toBe(true);}}
 if(info.status===info.expectedStatus)return;
 const path=info.outputPath('startup-audio.json'),state=network.get(page)!;
 const audio=await page.evaluate(()=>{const w=window as any;return{samples:w.startupSamples,metrics:w.audioProbe?.metrics(),calls:w.launchCalls,ends:w.launchEnds,cuts:w.launchCuts,screen:document.querySelector('#app')?.getAttribute('data-screen'),notice:document.querySelector('#audio-notice')?.textContent};});
 writeFileSync(path,JSON.stringify({...audio,pendingRequests:[...state.pending].map(r=>r.url()),failedRequests:state.failed,pageErrors:state.errors},null,2));await info.attach('startup-audio',{path,contentType:'application/json'});
});
const lengths=Object.fromEntries(Object.entries(clips).map(([cue,data])=>[Buffer.from(data,'base64').length/2,Number(cue)]));
async function probe(page:Page,delay=false,gap=true){await page.addInitScript(({lengths,delay,gap})=>{
 const w=window as any,request=requestAnimationFrame.bind(window),create=AudioContext.prototype.createBufferSource;w.launchCalls=[];w.launchEnds=[];w.launchCuts=[];w.heldLaunchFrames=[];w.holdLaunch=false;
 window.requestAnimationFrame=cb=>request(t=>{if(w.holdLaunch)w.heldLaunchFrames.push(cb);else cb(t);});w.releaseLaunchGap=()=>{w.holdLaunch=false;for(const cb of w.heldLaunchFrames.splice(0))request(cb);};
 AudioContext.prototype.createBufferSource=function(){const ctx=this,s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let cue:number|undefined,end=Infinity,cut=false,callIndex=-1;
  s.start=(at=ctx.currentTime)=>{if(s.buffer?.sampleRate===16000&&s.buffer.length in lengths){cue=lengths[s.buffer.length];if(cue===3&&delay)at+=1.2;if(cue===w.delayedCue)at+=30;end=at+s.buffer.duration;callIndex=w.launchCalls.length;w.launchCalls.push({cue,text:document.querySelector('#battle-message')?.textContent,at});if(cue===3&&gap&&!delay)w.holdLaunch=true;}start(at);};
  s.stop=(at=ctx.currentTime)=>{if(cue!==undefined&&at<end-.005&&!cut){cut=true;w.launchCuts.push({cue,index:callIndex});}stop(at);};s.addEventListener('ended',()=>{if(cue!==undefined)w.launchEnds.push(cue);});return s;};
 },{lengths,delay,gap});}
for(const mode of ['cpu','local'])test(`${mode}冷啟動與兩秒畫格空窗仍依序完整播報並對應畫面`,async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page);await page.goto(gameUrl,{waitUntil:'domcontentloaded'});if(mode==='local')await page.locator('[data-action="mode"][data-value="local"]').click();await page.locator('[data-action="quick-battle"]').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).heldLaunchFrames.length)).toBeGreaterThan(0);await page.waitForTimeout(2200);await expect(page.locator('.count-beat')).toHaveText('3');await page.evaluate(()=>(window as any).releaseLaunchGap());
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds)).toEqual([3,2,1,0]);
 const state=await page.evaluate(()=>({calls:(window as any).launchCalls,cuts:(window as any).launchCuts}));console.log('Cold launch',JSON.stringify(state));expect(state.calls.map((c:any)=>c.cue)).toEqual([3,2,1,0]);expect(state.cuts).toEqual([]);for(const c of state.calls)expect(c.text).toContain(c.cue===0?'GO SHOOT!':String(c.cue));
});
test('首拍聲源啟動延後仍等整句結束，不以牆上秒數截斷',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page,true);await page.goto(gameUrl,{waitUntil:'domcontentloaded'});await page.locator('[data-action="quick-battle"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds)).toEqual([3,2,1,0]);expect(await page.evaluate(()=>(window as any).launchCuts)).toEqual([]);
});
test('暫停與背景恢復只重新完成中斷當拍，不補播完成的數字',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page,false,false);await page.goto(gameUrl,{waitUntil:'domcontentloaded'});await page.evaluate(()=>(window as any).delayedCue=2);await page.locator('[data-action="quick-battle"]').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).launchCalls.at(-1)?.cue),{intervals:[25]}).toBe(2);await page.keyboard.press('Escape');await expect(page.locator('#pause-overlay')).toBeVisible();const count=await page.evaluate(()=>(window as any).launchCalls.length);await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).launchCalls.length)).toBe(count);await page.evaluate(()=>(window as any).delayedCue=1);await page.keyboard.press('Escape');
 await expect.poll(()=>page.evaluate(()=>(window as any).launchCalls.at(-1)?.cue),{intervals:[25]}).toBe(1);await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pageshow'));});await expect(page.locator('#pause-overlay')).toBeVisible();await page.evaluate(()=>(window as any).delayedCue=null);await page.locator('#pause-overlay [data-action="pause"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds.at(-1))).toBe(0);expect(await page.evaluate(()=>(window as any).launchCalls.map((c:any)=>c.cue))).toEqual([3,2,2,1,1,0]);expect(await page.evaluate(()=>(window as any).launchCuts)).toEqual([{cue:2,index:1},{cue:1,index:3}]);
});
for(const unavailable of [false,true])test(`靜音或無WebAudio也逐拍倒數且可開始對戰 unavailable=${unavailable}`,async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(unavailable=>{if(unavailable)(window as any).AudioContext=undefined;else localStorage.setItem('spinforge-muted','true');},unavailable);await page.goto(gameUrl,{waitUntil:'domcontentloaded'});await page.locator('[data-action="quick-battle"]').click();for(const cue of ['3','2','1'])await expect(page.locator('.count-beat')).toHaveText(cue);await expect(page.locator('.launch-call')).toHaveText('GO SHOOT!');await expect(page.locator('#app')).toHaveAttribute('data-screen','battle');
});
for(const mode of ['cpu','local'])for(const firstClock of [0,.0106666667])test(`${mode}啟動淡入前時鐘停在${firstClock}秒5.5秒仍完整倒數，不誤觸暫停`,async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page,false,false);
 await page.addInitScript(firstClock=>{
  const w=window as any,Original=AudioContext;
  w.AudioContext=class extends Original{
   private coldStart=performance.now();
   constructor(){super();w.coldStartedAt=this.coldStart;}
   get currentTime(){if(performance.now()-this.coldStart<5500)return firstClock;w.coldReleasedAt??=performance.now();return super.currentTime;}
  };
 },firstClock);
 await page.goto(gameUrl,{waitUntil:'domcontentloaded'});if(mode==='local')await page.locator('[data-action="mode"][data-value="local"]').click();await page.locator('[data-action="quick-battle"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:20000});await expect(page.locator('#pause-overlay')).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds)).toEqual([3,2,1,0]);
 const state=await page.evaluate(()=>{const w=window as any;return{calls:w.launchCalls,cuts:w.launchCuts,heldMs:w.coldReleasedAt-w.coldStartedAt};});
 expect(state.heldMs).toBeGreaterThanOrEqual(5500);expect(state.calls.map((c:any)=>c.cue)).toEqual([3,2,1,0]);expect(state.cuts).toEqual([]);
 for(const c of state.calls)expect(c.text).toContain(c.cue===0?'GO SHOOT!':String(c.cue));
});
test('零配樂且首字前音訊停鐘時顯示恢復提示，恢復仍完整倒數',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await probe(page,false,false);
 await page.addInitScript(()=>{localStorage.setItem('spinforge-music-volume','0');const w=window as any,Original=AudioContext;w.freezeLaunchClock=true;w.AudioContext=class extends Original{get currentTime(){return w.freezeLaunchClock?0:super.currentTime;}};});
 await page.goto(gameUrl,{waitUntil:'domcontentloaded'});await page.locator('[data-action="quick-battle"]').click();await expect(page.locator('#pause-overlay')).toBeVisible({timeout:12000});await expect(page.locator('#audio-notice')).toBeVisible();expect(await page.evaluate(()=>(window as any).launchCalls)).toEqual([]);
 await page.evaluate(()=>(window as any).freezeLaunchClock=false);await page.locator('#pause-overlay [data-action="pause"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:16000});await expect.poll(()=>page.evaluate(()=>(window as any).launchEnds)).toEqual([3,2,1,0]);expect(await page.evaluate(()=>(window as any).launchCuts)).toEqual([]);
});
