import{test,expect}from'@playwright/test';import clips from'../../src/countdown-voice-data.json' with{type:'json'};
const lengths=Object.fromEntries(Object.entries(clips).map(([cue,data])=>[Buffer.from(data,'base64').length/2,Number(cue)]));
for(const mode of ['cpu','local'])test(`${mode}開場英文語音依3、2、1、GO各播放一次`,async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(({lengths})=>{const w=window as any,create=AudioContext.prototype.createBufferSource;w.launchVoices=[];w.launchEnded=[];w.launchStopped=[];AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let cue:number|undefined;s.start=(...args:Parameters<typeof s.start>)=>{if(s.buffer?.sampleRate===16000&&s.buffer.length in lengths){cue=lengths[s.buffer.length];w.launchVoices.push(cue);}start(...args);};s.stop=(...args:Parameters<typeof s.stop>)=>{if(cue!==undefined)w.launchStopped.push(cue);stop(...args);};s.addEventListener('ended',()=>{if(cue!==undefined)w.launchEnded.push(cue);});return s;};},{lengths});
 await page.goto('/');if(mode==='local')await page.locator('[data-action="mode"][data-value="local"]').click();await page.locator('[data-action="quick-battle"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await expect.poll(()=>page.evaluate(()=>(window as any).launchVoices)).toEqual([3,2,1,0]);
 await expect.poll(()=>page.evaluate(()=>(window as any).launchEnded)).toEqual([3,2,1,0]);expect(await page.evaluate(()=>(window as any).launchStopped)).toEqual([]);expect(await page.evaluate(()=>(window as any).launchVoices)).toEqual([3,2,1,0]);
});
test('語音沿用靜音、暫停與背景清理，不在恢復時補播',async({page})=>{
 await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.diagnostics().ready)).toBe(true);
 await page.evaluate(lengths=>(window as any).voiceLengths=lengths,lengths);
 const result=await page.evaluate(()=>{const s=(window as any).audioSound,ctx=s.ctx,create=ctx.createBufferSource.bind(ctx),voices:any[]=[];ctx.createBufferSource=()=>{const source=create(),start=source.start.bind(source),stop=source.stop.bind(source);const entry={stopped:false};source.start=(...args:any[])=>{if(source.buffer?.sampleRate===16000&&source.buffer.length in (window as any).voiceLengths)voices.push(entry);start(...args);};source.stop=(...args:any[])=>{entry.stopped=true;stop(...args);};return source;};
 s.countdown(3);s.update(null,false,null);const paused=voices[0].stopped;s.countdown(2);s.toggle();const muted=voices[1].stopped;s.countdown(1);const mutedCount=voices.length;s.toggle();s.countdown(0);s.setBackground(true);const background=voices[2].stopped;s.setBackground(false);return{paused,muted,mutedCount,background,count:voices.length};});
 expect(result).toEqual({paused:true,muted:true,mutedCount:2,background:true,count:3});
 await page.waitForTimeout(250);await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.diagnostics().sources)).toBe(0);
});
