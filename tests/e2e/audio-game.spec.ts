import{installProbe}from'./audio-probe.ts';
import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 const state=await page.evaluate(()=>({screen:document.querySelector('#app')?.getAttribute('data-screen'),notice:document.querySelector('#audio-notice')?.textContent,paused:!document.querySelector<HTMLElement>('#pause-overlay')?.hidden,hidden:document.hidden,metrics:(window as any).audioProbe?.metrics()}));
 writeFileSync(`artifacts/p1-audio-game-failure-${info.line}.json`,JSON.stringify(state,null,2));
 await page.locator('.music-controls').evaluate((n:HTMLDetailsElement)=>n.open=true);
 await page.getByRole('button',{name:'裝置檢查',exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'匯出檢查紀錄',exact:true}).click();
 await (await pending).saveAs(`artifacts/p1-audio-game-events-${info.line}.json`);
});
test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:1080}});
// 原生Chrome音訊圖量測；背景事件注入不代表iPhone鎖屏硬體驗證。
test('正式雙人流程：背景恢復維持暫停，觸控或鍵盤繼續後音訊只恢復一份',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await installProbe(page);
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


test('正式遊戲耳機切換與來電暫停，恢復按鈕不改音量或重播舊聲源',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'audioSession',{value:Object.assign(new EventTarget(),{state:'active'})}));
  await installProbe(page);
  const metrics=()=>page.evaluate(()=>(window as any).audioProbe.metrics());
  await page.goto('/');await page.locator('[data-action="mode"][data-value="local"]').tap();await page.locator('[data-action="quick-battle"]').tap();
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await expect.poll(async()=>(await metrics()).loops).toBe(1);
  await page.getByLabel('配樂設定').tap();await page.getByLabel('背景音樂音量').fill('30');
  const recover=page.getByRole('button',{name:'恢復音訊',exact:true});await expect(recover).toBeVisible();
  const box=await page.locator('.music-controls > div').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
  await page.locator('.music-controls > div').screenshot({path:'artifacts/audio-recovery-panel-v0205.png'});
  await page.evaluate(()=>{for(let n=0;n<3;n++)navigator.mediaDevices.dispatchEvent(new Event('devicechange'));});
  await expect(page.locator('#pause-overlay')).toBeVisible();expect((await metrics()).loops).toBe(0);
  await recover.tap();expect((await metrics()).loops).toBe(0);await expect(page.locator('#pause-overlay')).toBeVisible();
  await page.locator('#pause-overlay [data-action="pause"]').tap();await expect.poll(async()=>(await metrics()).loops).toBe(1);
  await page.evaluate(()=>{const s=(navigator as any).audioSession;s.state='interrupted';s.dispatchEvent(new Event('statechange'));});
  await expect(page.locator('#pause-overlay')).toBeVisible();await expect(recover).toBeDisabled();expect((await metrics()).loops).toBe(0);
  await page.evaluate(()=>{const s=(navigator as any).audioSession;s.state='active';s.dispatchEvent(new Event('statechange'));});
  await page.waitForTimeout(100);expect((await metrics()).loops).toBe(0);
  await page.locator('#pause-overlay [data-action="pause"]').tap();await expect.poll(async()=>(await metrics()).loops).toBe(1);
  await expect.poll(async()=>(await metrics()).rms).toBeGreaterThan(.001);await expect(page.locator('#music-volume-label')).toHaveText('30%');
  expect((await metrics()).master).toBeLessThanOrEqual(.651);expect(errors).toEqual([]);
});
