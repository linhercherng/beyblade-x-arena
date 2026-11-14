import {test,expect} from '@playwright/test';
const metrics=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).audioMetrics());

test('裝置變更先斷開舊聲源，連續事件不重複恢復或改變音量',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await page.locator('#volume').fill('.3');
  await page.evaluate(()=>{for(let i=0;i<4;i++)navigator.mediaDevices.dispatchEvent(new Event('devicechange'));});
  expect((await metrics(page)).loops).toBe(0);expect((await metrics(page)).sources).toBe(0);
  await page.locator('#battle').click();await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  expect((await metrics(page)).volume).toBe(.3);expect((await metrics(page)).peak).toBeLessThan(.95);
});

test('來電AudioSession中斷期間按鍵不恢復，結束後等待手勢再淡入',async({page})=>{
  await page.addInitScript(()=>{const session=Object.assign(new EventTarget(),{state:'active'});Object.defineProperty(navigator,'audioSession',{value:session});});
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await page.evaluate(()=>{const session=(navigator as any).audioSession;session.state='interrupted';session.dispatchEvent(new Event('statechange'));});
  expect((await metrics(page)).loops).toBe(0);
  await page.locator('#battle').click();expect((await metrics(page)).loops).toBe(0);
  await page.evaluate(()=>{const session=(navigator as any).audioSession;session.state='active';session.dispatchEvent(new Event('statechange'));});
  await page.waitForTimeout(100);expect((await metrics(page)).loops).toBe(0);
  await page.locator('#battle').click();await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  expect((await metrics(page)).loops).toBe(1);
});

test('沒有裝置事件且running時鐘停住會清理，手動恢復後只保留一份配樂',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await page.evaluate(async()=>{
    const s=(window as any).audioSound,ctx=s.ctx,resume=ctx.resume.bind(ctx);
    Object.defineProperty(ctx,'state',{configurable:true,get:()=> 'running'});
    ctx.resume=()=>{delete ctx.state;return resume();};await ctx.suspend();
  });
  await expect.poll(async()=>(await metrics(page)).loops,{timeout:3000}).toBe(0);
  await page.locator('#recover').click();await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
});

test('輸出路由事件合併通知，靜音偏好與手動重試不會造成音量增加',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await page.evaluate(()=>{const w=window as any;w.interruptions=0;w.audioSound.onInterruption=()=>w.interruptions++;for(let n=0;n<4;n++)w.audioSound.ctx.dispatchEvent(new Event('sinkchange'));});
  expect(await page.evaluate(()=>(window as any).interruptions)).toBe(1);expect((await metrics(page)).sources).toBe(0);
  await page.locator('#mute').click();await page.locator('#volume').fill('.2');
  await page.evaluate(()=>navigator.mediaDevices.dispatchEvent(new Event('devicechange')));
  for(let n=0;n<3;n++)await page.locator('#recover').click();
  await page.waitForTimeout(350);expect((await metrics(page)).muted).toBe(true);expect((await metrics(page)).volume).toBe(.2);
  expect((await metrics(page)).loops).toBe(0);expect((await metrics(page)).rms).toBeLessThan(.0001);
  await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.001);
  expect((await metrics(page)).master).toBeLessThanOrEqual(.651);expect((await metrics(page)).peak).toBeLessThan(.95);
});

test('裝置切換期間過期resume不能重新開聲，新手勢可恢復',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await page.evaluate(async()=>{const w=window as any,s=w.audioSound;await s.ctx.suspend();const resume=s.ctx.resume.bind(s.ctx);w.resume=resume;s.ctx.resume=()=>new Promise(resolve=>{w.complete=()=>resume().then(resolve);});});
  await page.locator('#battle').click();
  await page.evaluate(()=>navigator.mediaDevices.dispatchEvent(new Event('devicechange')));
  await page.evaluate(()=>(window as any).complete());
  await page.waitForTimeout(100);expect((await metrics(page)).loops).toBe(0);expect((await metrics(page)).master).toBe(0);
  await page.evaluate(()=>{const w=window as any;w.audioSound.ctx.resume=w.resume;});
  await page.locator('#recover').click();await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
});

test('只有音效時時鐘停住也會丟棄舊音效，恢復後不補播',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#menu').click();await expect.poll(async()=>(await metrics(page)).loops).toBe(1);await page.locator('#volume').fill('0');
  await expect.poll(async()=>(await metrics(page)).loops).toBe(0);
  await page.evaluate(async()=>{
    const s=(window as any).audioSound,ctx=s.ctx,resume=ctx.resume.bind(ctx);s.finish({winner:0,finish:'extreme',points:3,time:20},.55,true);
    Object.defineProperty(ctx,'state',{configurable:true,get:()=> 'running'});
    ctx.resume=()=>{delete ctx.state;return resume();};await ctx.suspend();
  });
  expect((await metrics(page)).sources).toBe(1);
  await expect.poll(async()=>(await metrics(page)).sources,{timeout:3000}).toBe(0);
  await page.locator('#recover').click();await expect.poll(async()=>(await metrics(page)).rms).toBeLessThan(.0001);
  expect((await metrics(page)).sources).toBe(0);expect((await metrics(page)).volume).toBe(0);
});
