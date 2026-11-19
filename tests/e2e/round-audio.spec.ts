import{test,expect}from'@playwright/test';import{installAnnouncerProbe}from'./announcer-probe.ts';import clips from'../../src/countdown-voice-data.json' with{type:'json'};
import{writeFileSync}from'node:fs';
import{profileGame}from'./game-render-profile.ts';
test.setTimeout(process.env.CI?360000:180000);
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 const path=info.outputPath('round-state.json');writeFileSync(path,JSON.stringify(await page.evaluate(()=>{const w=window as any,c=w.latestSpeech?.context;return{screen:document.querySelector('#app')?.getAttribute('data-screen'),round:document.querySelector('h1')?.textContent,timer:document.querySelector('[role="timer"]')?.textContent,paused:!document.querySelector<HTMLElement>('#pause-overlay')?.hidden,notice:document.querySelector('#audio-notice')?.textContent,announced:w.announced,cues:w.launchCues,rematch:w.rematchSpeech,stoppedDuringAction:w.rematchStoppedDuringAction,stops:w.priorSpeech?w.speechStops?.get(w.priorSpeech):null,audio:c?{state:c.state,clock:c.currentTime}:null};}),null,2));await info.attach('round-state',{path,contentType:'application/json'});
});
const lengths=Object.fromEntries(Object.entries(clips).map(([key,data])=>[Buffer.from(data,'base64').length/2,Number(key)]));
test('正式單人勝負播報中立即再戰，舊語音收尾且下一場倒數完整只播一次',async({page},info)=>{
 await profileGame(page);await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await installAnnouncerProbe(page);
 // Keep the victory voice alive so natural completion cannot pass cancellation.
 await page.addInitScript(({lengths})=>{const w=window as any,create=AudioContext.prototype.createBufferSource;Object.defineProperty(crypto,'getRandomValues',{value:(a:Uint32Array)=>{a.fill(7181);return a;}});w.launchCues=[];w.speechEnded=new WeakSet();w.speechStarts=new WeakMap();w.speechStops=new WeakMap();const request=window.requestAnimationFrame.bind(window),pending:FrameRequestCallback[]=[];let released=false,resumed=0;window.requestAnimationFrame=cb=>request(time=>{if(w.holdRematchFrames)pending.push(cb);else{if(released)resumed++;cb(time);}});w.rematchFrames=()=>({held:pending.length,resumed});w.releaseRematchGap=()=>{w.holdRematchFrames=false;released=true;for(const cb of pending.splice(0))request(cb);};AudioContext.prototype.createBufferSource=function(){const ctx=this,s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);s.start=(...args:Parameters<typeof s.start>)=>{const at=Math.max(ctx.currentTime,args[0]??0);const result=start(...args);if(s.buffer?.sampleRate===16000){w.latestSpeech=s;w.speechStarts.set(s,at);if(s.buffer.length in lengths)w.launchCues.push(lengths[s.buffer.length]);if(/victory|defeat/.test(w.announcementKeys.get(s)??''))s.loop=true;}return result;};s.stop=(at=0)=>{const now=ctx.currentTime;stop(at);const records=w.speechStops.get(s)??[];records.push({requestedAt:now,scheduledAt:Math.max(now,at)});w.speechStops.set(s,records);};s.addEventListener('ended',()=>w.speechEnded.add(s));return s;};},{lengths});
 await page.goto(process.env.CI?'/?software-gpu&audio-only':'/');await page.locator('[data-action="quick-battle"]').click();let won=false;
 for(let i=0;i<14;i++){
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});const speed=page.locator('[data-action="speed"]');while(await speed.textContent()!=='4×')await speed.click();await expect(page.locator('[data-action="next-round"],[data-action="rematch"]')).toBeVisible({timeout:45000});
  if(await page.locator('.result-hero').isVisible()){
   won=true;await expect.poll(()=>page.evaluate(()=>(window as any).announced.at(-1))).toMatch(/victory|defeat/);await page.locator('[data-action="rematch"]').evaluate(button=>{button.addEventListener('click',()=>{const w=window as any,s=w.priorSpeech=w.latestSpeech;w.launchCues=[];w.holdRematchFrames=true;w.rematchSpeech={key:w.announcementKeys.get(s),loop:s.loop,ended:w.speechEnded.has(s),state:s.context.state,at:s.context.currentTime,startedAt:w.speechStarts.get(s)};},{once:true,capture:true});document.addEventListener('click',event=>{if(event.composedPath().includes(button)){const w=window as any;w.rematchStoppedDuringAction=(w.speechStops.get(w.priorSpeech)??[]).some((s:any)=>s.scheduledAt<=w.rematchSpeech.at+.3);}},{once:true});});
   try{
    await page.locator('[data-action="rematch"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','launch');
    await expect.poll(()=>page.evaluate(()=>{const w=window as any;return w.priorSpeech.context.currentTime-w.rematchSpeech.at;}),{timeout:2500,intervals:[20]}).toBeGreaterThanOrEqual(.4);
    const interruption=await page.evaluate(()=>{const w=window as any;return{...w.rematchSpeech,stoppedDuringAction:w.rematchStoppedDuringAction,stops:w.speechStops.get(w.priorSpeech)??[],clock:w.priorSpeech.context.currentTime,frames:w.rematchFrames()};});
    writeFileSync(`artifacts/rematch-stop-${process.env.CI?'software':'native'}-v0430.json`,JSON.stringify(interruption,null,2));expect(interruption.key).toMatch(/victory|defeat/);expect(interruption.loop).toBe(true);expect(interruption.ended).toBe(false);expect(interruption.state).toBe('running');expect(interruption.at).toBeGreaterThanOrEqual(interruption.startedAt);expect(interruption.frames.held).toBeGreaterThan(0);
    expect(interruption.stops.some((stop:any)=>stop.scheduledAt<=interruption.at+.3)).toBe(true);
   }finally{await page.evaluate(()=>(window as any).releaseRematchGap());}
   await expect.poll(()=>page.evaluate(()=>(window as any).rematchFrames().resumed)).toBeGreaterThanOrEqual(2);expect(await page.evaluate(()=>(window as any).rematchFrames().held)).toBe(0);
   await expect.poll(()=>page.evaluate(()=>(window as any).speechEnded.has((window as any).priorSpeech)),{timeout:process.env.CI?5000:300,intervals:[20]}).toBe(true);
   await page.keyboard.press('Space');await expect.poll(()=>page.evaluate(()=>(window as any).launchCues),{timeout:12000}).toEqual([3,2,1,0]);await expect(page.locator('#app')).toHaveAttribute('data-screen','battle');break;
  }
  await page.locator('[data-action="next-round"]').click();await page.keyboard.press('Space');
 }
 expect(won).toBe(true);
 if(process.env.CI){const profiles=await page.evaluate(()=>(window as any).gameRenderProfiles?.map((info:()=>unknown)=>info())??[]);await info.attach('game-render-profile',{body:JSON.stringify({scope:'native-audio-game-transition-clock-only',profiles}),contentType:'application/json'});expect(profiles.length).toBeGreaterThan(0);expect(profiles.every((p:any)=>p.softwareGpu&&p.audioOnly)).toBe(true);}
});
