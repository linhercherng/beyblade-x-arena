import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 const state=await page.evaluate(()=>({audio:(window as any).audioSound?.diagnostics(),resumeCalls:(window as any).resumeCalls,metrics:(window as any).audioMetrics?.()}));
 writeFileSync(`artifacts/p1-audio-lifecycle-failure-${info.line}.json`,JSON.stringify(state,null,2));
});
const metrics=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).audioMetrics());
test('音訊裝置中斷立即丟棄舊聲源，恢復手勢只建立一份配樂並淡入',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  await page.evaluate(async()=>{const s=(window as any).audioSound;s.tone(200,2);await s.ctx.suspend();});
  await expect.poll(async()=>(await metrics(page)).playing).toBeNull();
  expect((await metrics(page)).sources).toBe(0);
  // 停住的音訊時鐘尚未反映排程；模擬系統自行恢復，仍不得輸出舊音訊。
  await page.evaluate(()=>(window as any).audioSound.ctx.resume());
  await expect.poll(async()=>(await metrics(page)).master).toBe(0);
  await expect.poll(async()=>(await metrics(page)).rms).toBeLessThan(.0001);
  await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).context).toBe('running');
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
});


test('快速背景來回、靜音與音量偏好不變，未重新操作前保持安靜',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  for(let n=0;n<4;n++){
    await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pageshow'));});
    expect((await metrics(page)).loops).toBe(0);
    await page.locator('#battle').click();
    await expect.poll(async()=>(await metrics(page)).context).toBe('running');
    await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
    await expect.poll(async()=>(await metrics(page)).loops).toBe(1);expect((await metrics(page)).peak).toBeLessThan(.95);
  }
  await page.locator('#mute').click();
  await page.locator('#volume').fill('.3');
  await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pageshow'));});
  await page.locator('#battle').click();await page.waitForTimeout(350);
  expect((await metrics(page)).muted).toBe(true);expect((await metrics(page)).volume).toBe(.3);
  expect((await metrics(page)).rms).toBeLessThan(.0001);expect((await metrics(page)).loops).toBe(0);
  await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.001);
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);expect(errors).toEqual([]);
});

test('過期resume完成不會在背景建立聲源，新手勢可以再恢復',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#menu').click();
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  await page.evaluate(async()=>{
    const s=(window as any).audioSound;await s.ctx.suspend();
    const resume=s.ctx.resume.bind(s.ctx);
    (window as any).realResume=resume;
    s.ctx.resume=()=>new Promise(resolve=>{(window as any).completeResume=()=>resume().then(resolve);});
  });
  await page.locator('#menu').click();
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  await page.evaluate(async()=>{await (window as any).completeResume();});
  expect((await metrics(page)).master).toBe(0);expect((await metrics(page)).loops).toBe(0);
  await page.evaluate(()=>{const s=(window as any).audioSound;s.ctx.resume=(window as any).realResume;window.dispatchEvent(new Event('pageshow'));});
  await page.locator('#menu').click();await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
});


test('未完成的resume可由後續手勢重試，快速連按不重複請求',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#menu').click();
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  await page.evaluate(async()=>{
    const s=(window as any).audioSound;await s.ctx.suspend();const resume=s.ctx.resume.bind(s.ctx);
    (window as any).resumeCalls=0;
    s.ctx.resume=()=>++(window as any).resumeCalls===1?new Promise(()=>{}):resume();
  });
  await page.locator('#menu').click();
  await page.evaluate(()=>{const s=(window as any).audioSound;s.unlock();s.unlock();});
  expect(await page.evaluate(()=>(window as any).resumeCalls)).toBe(1);
  await page.waitForTimeout(350);await page.locator('#menu').click();
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  expect(await page.evaluate(()=>(window as any).resumeCalls)).toBe(2);
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
});

test('背景期間下載失敗不永久封鎖曲目，恢復後重新載入且只播放一份',async({page})=>{
  let release!:()=>void,requested=0;const hold=new Promise<void>(resolve=>release=resolve);
  await page.route('**/audio/battle.mp3',async route=>{requested++;if(requested===1){await hold;await route.abort();}else await route.continue();});
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(()=>requested).toBe(1);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));release();
  await page.waitForTimeout(150);expect((await metrics(page)).loops).toBe(0);
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await page.locator('#battle').click();
  await expect.poll(()=>requested).toBe(2);
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
});


test('Safari interrupted狀態注入後可由手勢恢復，反覆點選不另開配樂',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await page.evaluate(async()=>{
    const s=(window as any).audioSound;await s.ctx.suspend();
    Object.defineProperty(s.ctx,'state',{configurable:true,get:()=> 'interrupted'});
    s.ctx.dispatchEvent(new Event('statechange'));
    const resume=s.ctx.resume.bind(s.ctx);s.ctx.resume=()=>{delete s.ctx.state;return resume();};
  });
  expect((await metrics(page)).loops).toBe(0);
  await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  for(let n=0;n<3;n++)await page.locator('#battle').click();
  expect((await metrics(page)).loops).toBe(1);expect((await metrics(page)).peak).toBeLessThan(.95);
});

for(const muted of [false,true])test(`恢復淡入期間${muted?'取消靜音':'立刻靜音'}會取消舊的音量排程`,async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
  if(muted)await page.locator('#mute').click();
  await page.evaluate(async()=>{const s=(window as any).audioSound;s.setBackground(true);await s.ctx.suspend();s.setBackground(false);await s.ctx.resume();});
  await page.locator('#battle').click();await page.locator('#mute').click();
  await page.waitForTimeout(600);
  expect((await metrics(page)).muted).toBe(!muted);
  if(muted){expect((await metrics(page)).master).toBeCloseTo(.65,2);expect((await metrics(page)).rms).toBeGreaterThan(.003);}
  else {expect((await metrics(page)).master).toBeLessThan(.0001);expect((await metrics(page)).rms).toBeLessThan(.0001);}
});

test('回報running但音訊時鐘凍結仍會在恢復手勢內重啟',async({page})=>{
  await page.goto('/tests/fixtures/audio.html');await page.locator('#battle').click();
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);
  await page.evaluate(()=>(window as any).audioSound.ctx.suspend());
  await expect.poll(async()=>(await metrics(page)).playing).toBeNull();
  const stopped=await page.evaluate(()=>{
    const s=(window as any).audioSound,ctx=s.ctx,resume=ctx.resume.bind(ctx);
    Object.defineProperty(ctx,'state',{configurable:true,get:()=> 'running'});
    ctx.resume=()=>{delete ctx.state;return resume();};return ctx.currentTime;
  });
  await page.locator('#battle').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.ctx.currentTime)).toBeGreaterThan(stopped+.1);
  await expect.poll(async()=>(await metrics(page)).loops).toBe(1);await expect.poll(async()=>(await metrics(page)).rms).toBeGreaterThan(.003);
});
