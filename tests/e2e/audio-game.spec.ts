import {test,expect} from '@playwright/test';
test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:1080}});
// 原生Chrome音訊圖量測；背景事件注入不代表iPhone鎖屏硬體驗證。
test('正式雙人流程：背景恢復維持暫停，觸控或鍵盤繼續後音訊只恢復一份',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const original=window.AudioContext;
    (window as any).AudioContext=class extends original{
      constructor(...args:ConstructorParameters<typeof AudioContext>){
        super(...args);const ctx=this,createGain=this.createGain.bind(this),createSource=this.createBufferSource.bind(this),sources=new Set<AudioBufferSourceNode>();
        let analyser:AnalyserNode,master:GainNode;
        this.createGain=()=>{const gain=createGain();if(!master){master=gain;analyser=ctx.createAnalyser();master.connect(analyser);}return gain;};
        this.createBufferSource=()=>{const source=createSource(),disconnect=source.disconnect.bind(source);sources.add(source);source.addEventListener('ended',()=>sources.delete(source));source.disconnect=()=>{sources.delete(source);disconnect();};return source;};
        (window as any).audioProbe={ctx,metrics:()=>{const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);return {state:ctx.state,master:master.gain.value,loops:[...sources].filter(s=>s.loop).length,rms:Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length)};}};
      }
    };
  });
  const metrics=()=>page.evaluate(()=>(window as any).audioProbe.metrics());
  await page.goto('/');await page.locator('[data-action="mode"][data-value="local"]').tap();await page.locator('[data-action="quick-battle"]').tap();
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  await expect.poll(async()=>(await metrics()).loops).toBe(1);await expect.poll(async()=>(await metrics()).rms).toBeGreaterThan(.003);
  for(let n=0;n<2;n++){
    await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pageshow'));});
    await expect(page.locator('#pause-overlay')).toBeVisible();expect((await metrics()).loops).toBe(0);
    await page.evaluate(()=>(window as any).audioProbe.ctx.resume());
    await expect.poll(async()=>(await metrics()).master).toBe(0);await expect.poll(async()=>(await metrics()).rms).toBeLessThan(.0001);
    if(n===0)await page.locator('#pause-overlay [data-action="pause"]').tap();else await page.keyboard.press('Escape');
    await expect(page.locator('#pause-overlay')).toBeHidden();await expect.poll(async()=>(await metrics()).loops).toBe(1);await expect.poll(async()=>(await metrics()).rms).toBeGreaterThan(.003);
  }
  await page.locator('#shout-0').tap();await page.locator('#shout-1').tap();
  for(const p of [0,1])await expect(page.locator(`#shout-${p}`)).toBeDisabled();expect(errors).toEqual([]);
});
