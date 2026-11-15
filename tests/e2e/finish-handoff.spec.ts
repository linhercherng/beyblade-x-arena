import{test,expect,type Page}from'@playwright/test';
const metrics=(p:Page)=>p.evaluate(()=>(window as any).finishMaterialMetrics());
async function open(p:Page){await p.goto('/tests/fixtures/finish-material-audio.html');await p.locator('#enable').click();await expect.poll(async()=>(await metrics(p)).ready).toBe(true);await expect.poll(async()=>(await metrics(p)).playing).toBe('results');}

test('慢放材質終結的配樂退讓不被後續碰撞或音量設定提前解除',async({page})=>{
 await open(page);await page.evaluate(()=>{const w=window as any;w.finishMaterialSound.setMusicVolume(1);w.finishMaterial('burst','metal',.55,true);});
 await expect.poll(async()=>(await metrics(page)).musicDuck).toBeLessThan(.26);
 await page.waitForTimeout(200);expect((await metrics(page)).musicDuck).toBeLessThan(.13);await page.evaluate(()=>{const s=(window as any).finishMaterialSound;s.event({type:'hit',time:21,x:0,z:0,strength:.1});s.setMusicVolume(1);});
 await page.waitForTimeout(500);expect((await metrics(page)).musicDuck).toBeLessThan(.26);
 await expect.poll(async()=>(await metrics(page)).cues.length).toBe(0);await expect.poll(async()=>(await metrics(page)).musicDuck).toBeGreaterThan(.98);
});

test('四十次切換勝負播報最多一個主語音與一個淡出尾音，中斷後不補播',async({page})=>{
 await open(page);await page.evaluate(()=>{const s=(window as any).finishMaterialSound;for(let i=0;i<40;i++)s.victory(i%2===0);});
 expect((await metrics(page)).maxVoices).toBeLessThanOrEqual(2);await expect.poll(async()=>(await metrics(page)).peak).toBeGreaterThan(.001);expect((await metrics(page)).peak).toBeLessThan(.95);
 await page.evaluate(()=>(window as any).finishMaterialSound.setBackground(true));await expect.poll(async()=>(await metrics(page)).voices).toBe(0);await page.evaluate(()=>(window as any).finishMaterialSound.setBackground(false));await page.locator('#enable').click();await expect.poll(async()=>(await metrics(page)).ready).toBe(true);expect((await metrics(page)).voices).toBe(0);
});

test('勝負播報結束後音效柔順釋放，再次播報仍立即取得優先且取消後恢復',async({page})=>{
 await open(page);await page.evaluate(async()=>{const s=(window as any).finishMaterialSound;s.victory(false,1);await new Promise(resolve=>s.voicePlayback.source.addEventListener('ended',resolve,{once:true}));await new Promise(resolve=>setTimeout(resolve,260));});
 const m=await metrics(page);expect(m.voiceSfx).toBeGreaterThan(.5);expect(m.voiceSfx).toBeLessThan(.9);
 await page.evaluate(()=>(window as any).finishMaterialSound.victory(true));await expect.poll(async()=>(await metrics(page)).voiceSfx).toBeLessThan(.33);await page.locator('#stop').click();await expect.poll(async()=>(await metrics(page)).voices).toBe(0);await expect.poll(async()=>(await metrics(page)).voiceSfx).toBeGreaterThan(.98);await expect.poll(async()=>(await metrics(page)).musicDuck).toBeGreaterThan(.98);
});

test('三種材質終結同時播報時，語音保持前景且最大結算配樂不造成峰值突增',async({page})=>{
 await open(page);await page.evaluate(()=>(window as any).finishMaterialSound.setMusicVolume(1));
 for(const material of ['metal','plastic','rubber']){
  const mix=await page.evaluate(async material=>{const w=window as any,s=w.finishMaterialSound;w.finishMaterial('extreme',material,1,false);const nodes=[s.voicePlayback.gain,s.voiceMusicDuck,s.voiceSfxDuck,s.master],meters=nodes.map(n=>{const a=s.ctx.createAnalyser();a.fftSize=2048;n.connect(a);return a;});const result={voice:0,music:0,sfx:0,peak:0},until=performance.now()+300;
   await new Promise<void>(resolve=>{function sample(){const waves=meters.map(a=>{const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return data;});for(let i=0;i<=1536;i+=128){const rms=(k:number)=>Math.sqrt(waves[k].slice(i,i+512).reduce((n,x)=>n+x*x,0)/512),v=rms(0);if(v>result.voice){result.voice=v;result.music=rms(1);result.sfx=rms(2);}}for(const v of waves[3])result.peak=Math.max(result.peak,Math.abs(v));if(performance.now()<until)requestAnimationFrame(sample);else resolve();}sample();});nodes.forEach((n,i)=>n.disconnect(meters[i]));return result;
  },material);console.log(material,JSON.stringify(mix));expect(mix.voice).toBeGreaterThan(.02);expect(mix.voice).toBeGreaterThan(mix.music*2);expect(mix.voice).toBeGreaterThan(mix.sfx*1.2);expect(mix.peak).toBeLessThan(.95);
 }
});
