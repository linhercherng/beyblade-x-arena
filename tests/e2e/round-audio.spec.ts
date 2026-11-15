import{test,expect}from'@playwright/test';import{installAnnouncerProbe}from'./announcer-probe.ts';import clips from'../../src/countdown-voice-data.json' with{type:'json'};
const lengths=Object.fromEntries(Object.entries(clips).map(([key,data])=>[Buffer.from(data,'base64').length/2,Number(key)]));
test('正式單人勝負播報中立即再戰，舊語音收尾且下一場倒數完整只播一次',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await installAnnouncerProbe(page);
 await page.addInitScript(({lengths})=>{const w=window as any,create=AudioContext.prototype.createBufferSource;Object.defineProperty(crypto,'getRandomValues',{value:(a:Uint32Array)=>{a.fill(7181);return a;}});w.launchCues=[];w.speechEnded=new WeakSet();AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s);s.start=(...args:Parameters<typeof s.start>)=>{if(s.buffer?.sampleRate===16000){w.latestSpeech=s;if(s.buffer.length in lengths)w.launchCues.push(lengths[s.buffer.length]);}return start(...args);};s.addEventListener('ended',()=>w.speechEnded.add(s));return s;};},{lengths});
 await page.goto('/');await page.locator('[data-action="quick-battle"]').click();let won=false;
 for(let i=0;i<14;i++){
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});const speed=page.locator('[data-action="speed"]');while(await speed.textContent()!=='4×')await speed.click();await expect(page.locator('[data-action="next-round"],[data-action="rematch"]')).toBeVisible({timeout:45000});
  if(await page.locator('.result-hero').isVisible()){
   won=true;await expect.poll(()=>page.evaluate(()=>(window as any).announced.at(-1))).toMatch(/victory|defeat/);await page.evaluate(()=>{const w=window as any;w.priorSpeech=w.latestSpeech;w.launchCues=[];});await page.locator('[data-action="rematch"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','launch');
   await expect.poll(()=>page.evaluate(()=>(window as any).speechEnded.has((window as any).priorSpeech)),{timeout:300,intervals:[20]}).toBe(true);
   await page.keyboard.press('Space');await expect.poll(()=>page.evaluate(()=>(window as any).launchCues),{timeout:12000}).toEqual([3,2,1,0]);await expect(page.locator('#app')).toHaveAttribute('data-screen','battle');break;
  }
  await page.locator('[data-action="next-round"]').click();await page.keyboard.press('Space');
 }
 expect(won).toBe(true);
});
