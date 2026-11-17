import{test,expect,type Page}from'@playwright/test';
import{installProbe}from'./audio-probe.ts';
const routes=['device','sink','session']as const;
async function installSession(page:Page){await page.addInitScript(()=>Object.defineProperty(navigator,'audioSession',{value:Object.assign(new EventTarget(),{state:'active'})}));}
async function interrupt(page:Page,route:typeof routes[number]){
 await page.evaluate(route=>{const w=window as any;for(let n=0;n<4;n++){
  if(route==='device')navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
  else if(route==='sink')(w.audioSound?.ctx??w.audioProbe.ctx).dispatchEvent(new Event('sinkchange'));
  else{const s=(navigator as any).audioSession;s.state='interrupted';s.dispatchEvent(new Event('statechange'));}
 }},route);
}

for(const route of routes)for(const muted of [false,true])test(`${route}中斷合併通知與音量恢復，靜音=${muted}`,async({page})=>{
 await installSession(page);await page.goto('/tests/fixtures/audio.html');await page.locator('#results').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.countdownReady)).toBe(true);await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().rms)).toBeGreaterThan(.003);await page.locator('#volume').fill('.35');if(muted)await page.locator('#mute').click();
 await page.evaluate(()=>{const w=window as any;w.interruptions=0;w.audioSound.onInterruption=()=>w.interruptions++;w.audioSound.countdown(3);});await interrupt(page,route);
 expect(await page.evaluate(()=>(window as any).interruptions)).toBe(1);expect(await page.evaluate(()=>(window as any).audioMetrics().sources)).toBe(0);expect(await page.evaluate(()=>(window as any).audioSound.voicePlayback)).toBe(null);
 await page.evaluate(async()=>{const s=(window as any).audioSound;await s.ctx.resume();s.setMusicVolume(.2);});await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().rms)).toBeLessThan(.0001);expect(await page.evaluate(()=>(window as any).audioMetrics().master)).toBe(0);
 if(route==='session')await page.evaluate(()=>{const s=(navigator as any).audioSession;s.state='active';s.dispatchEvent(new Event('statechange'));});
 await page.waitForTimeout(100);expect(await page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(0);await page.locator('#recover').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.diagnostics().ready)).toBe(true);
 expect(await page.evaluate(()=>(window as any).audioMetrics().muted)).toBe(muted);expect(await page.evaluate(()=>(window as any).audioMetrics().volume)).toBe(.2);
 if(muted){expect(await page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(0);expect(await page.evaluate(()=>(window as any).audioMetrics().rms)).toBeLessThan(.0001);await page.locator('#mute').click();}
 await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(1);await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().rms)).toBeGreaterThan(.001);expect(await page.evaluate(()=>(window as any).audioMetrics().master)).toBeLessThanOrEqual(.651);expect(await page.evaluate(()=>(window as any).audioMetrics().peak)).toBeLessThan(.95);expect(await page.evaluate(()=>(window as any).audioSound.voicePlayback)).toBe(null);expect(await page.evaluate(()=>(window as any).interruptions)).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('spinforge-music-volume'))).toBe('0.2');
});

for(const mode of ['cpu','local'])test(`${mode}靜音下耳機與來電中斷仍自動暫停，恢復不改最新音量或自行開聲`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await installSession(page);await installProbe(page);await page.goto('/');const metrics=()=>page.evaluate(()=>(window as any).audioProbe.metrics());await page.getByLabel('配樂設定',{exact:true}).click();await expect.poll(async()=>(await metrics()).rms).toBeGreaterThan(.003);await page.getByLabel('配樂設定',{exact:true}).click();
 for(const route of routes){
  await page.locator('[data-action=mode][data-value='+mode+']').click();await page.locator('[data-action=quick-battle]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await page.getByLabel('配樂設定',{exact:true}).click();await page.getByLabel('背景音樂音量',{exact:true}).fill('35');await page.getByRole('button',{name:'切換音效',exact:true}).click();await interrupt(page,route);await expect(page.locator('#pause-overlay')).toBeVisible({timeout:3000});expect((await metrics()).loops).toBe(0);
  await page.evaluate(()=>(window as any).audioProbe.ctx.resume());await expect.poll(async()=>(await metrics()).rms).toBeLessThan(.0001);await page.getByLabel('背景音樂音量',{exact:true}).fill('15');
  if(route==='session'){
   await expect(page.getByRole('button',{name:'恢復音訊',exact:true})).toBeDisabled();await page.evaluate(()=>{const s=(navigator as any).audioSession;s.state='active';s.dispatchEvent(new Event('statechange'));});
  }
  await page.locator('#pause-overlay [data-action=pause]').click();await expect(page.locator('#pause-overlay')).toBeHidden();await expect(page.getByRole('button',{name:'切換音效',exact:true})).toHaveText('音效 關');expect((await metrics()).loops).toBe(0);expect((await metrics()).rms).toBeLessThan(.0001);await page.getByRole('button',{name:'切換音效',exact:true}).click();await expect.poll(async()=>(await metrics()).loops).toBe(1);await expect.poll(async()=>(await metrics()).rms).toBeGreaterThan(.001);await expect(page.locator('#music-volume')).toHaveValue('15');expect((await metrics()).master).toBeLessThanOrEqual(.651);expect(await page.evaluate(()=>localStorage.getItem('spinforge-muted'))).toBe('false');expect(await page.evaluate(()=>localStorage.getItem('spinforge-music-volume'))).toBe('0.15');await page.locator('[data-action=exit]').click();await page.locator('[data-action=confirm-exit]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','home');
 }
 expect(errors).toEqual([]);
});
