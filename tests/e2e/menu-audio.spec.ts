import{test,expect,type Page}from'@playwright/test';
async function open(p:Page,mode='battle'){await p.goto('/tests/fixtures/audio.html');await p.locator('#'+mode).click();await expect.poll(()=>p.evaluate(()=>(window as any).audioSound.diagnostics().ready)).toBe(true);await expect.poll(()=>p.evaluate(()=>(window as any).audioMetrics().playing)).toBe(mode);}
async function observe(p:Page){await p.evaluate(async()=>{const w=window as any,{Sound}=await import('/src/audio.ts'),update=Sound.prototype.update;Sound.prototype.update=function(...args:any[]){w.menuSound=this;return update.apply(this,args);};});}
async function menu(p:Page){await p.setViewportSize({width:900,height:700});await p.goto('/');await observe(p);await p.locator('[data-action="mode"][data-value="cpu"]').click();await expect.poll(()=>p.evaluate(()=>(window as any).menuSound?.playing?.mode)).toBe('menu');}

test('返回選單取消上一段終結的長退讓，平滑恢復且不改音量偏好',async({page})=>{
 await menu(page);await page.evaluate(()=>{const s=(window as any).menuSound;s.setMusicVolume(.4);s.finish({winner:0,finish:'burst',points:2,time:20});});await expect.poll(()=>page.evaluate(()=>(window as any).menuSound.musicDuck.gain.value)).toBeLessThan(.26);await page.locator('[data-action="home"]').first().click();
 await expect.poll(()=>page.evaluate(()=>(window as any).menuSound.musicDuck.gain.value),{timeout:1200,intervals:[20]}).toBeGreaterThan(.98);expect(await page.evaluate(()=>(window as any).menuSound.volume)).toBe(.4);expect(await page.evaluate(()=>(window as any).menuSound.cues.size)).toBe(0);
});

test('同曲選單等待不會每幀取消新發出的鎖定提示音',async({page})=>{
 await open(page,'menu');await page.evaluate(()=>{const w=window as any,s=w.audioSound;s.tone(660,.8);w.lockSound=[...s.tones.keys()].at(-1);w.lockEnded=false;w.lockSound.addEventListener('ended',()=>w.lockEnded=true);});await page.waitForTimeout(100);expect(await page.evaluate(()=>(window as any).lockEnded)).toBe(false);await expect.poll(()=>page.evaluate(()=>(window as any).lockEnded)).toBe(true);
});

test('正式返回主選單、重新選隊與切換模式同步清理短音，保留同一首選單配樂',async({page})=>{
 await menu(page);await page.waitForTimeout(550);await page.evaluate(()=>(window as any).menuMusic=(window as any).menuSound.playing.source);
 for(const selector of ['[data-action=home]','[data-action=play]','[data-action=home]','[data-action=mode][data-value=local]','[data-action=mode][data-value=cpu]','[data-action=play]','[data-action=home]']){
  const result=await page.evaluate(selector=>{const w=window as any,s=w.menuSound;s.tone(330,.8,'triangle',.3);const source=[...s.tones.keys()].at(-1),stop=source.stop.bind(source);let stopped=false;source.stop=(at:number)=>{stopped=at<=s.ctx.currentTime+.02;return stop(at);};(document.querySelector(selector)as HTMLElement).click();return{stopped,sameMusic:s.playing.source===w.menuMusic};},selector);expect(result.stopped).toBe(true);expect(result.sameMusic).toBe(true);await expect.poll(()=>page.evaluate(()=>(window as any).menuSound.tones.size)).toBe(0);
 }
 expect(await page.evaluate(()=>(window as any).menuSound.diagnostics().muted)).toBe(false);
});

test('暫停離開對戰後重新選隊恢復選單配樂，不補播舊倒數',async({page})=>{
 await page.setViewportSize({width:900,height:700});await page.goto('/');await observe(page);await page.locator('[data-action="quick-battle"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await page.locator('[data-action="pause"]').first().click();await expect.poll(()=>page.evaluate(()=>(window as any).menuSound.requested)).toBe(null);await page.locator('[data-action="exit"]').click();await page.locator('[data-action="confirm-exit"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','home');await page.locator('[data-action="play"]').first().click();await expect(page.locator('#app')).toHaveAttribute('data-screen','team');
 await expect.poll(()=>page.evaluate(()=>(window as any).menuSound.requested)).toBe('menu');await expect.poll(()=>page.evaluate(()=>(window as any).menuSound.playing?.mode)).toBe('menu');expect(await page.evaluate(()=>(window as any).menuSound.voicePlayback)).toBe(null);expect(await page.evaluate(()=>(window as any).menuSound.cues.size)).toBe(0);
});
