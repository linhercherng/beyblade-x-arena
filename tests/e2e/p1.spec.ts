import {test,expect,type Page} from '@playwright/test';
test.setTimeout(45000);
test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:1080}});
const action=(page:Page,a:string)=>page.locator(`[data-action="${a}"]`);
async function localLaunch(page:Page){
 await page.goto('/');await page.locator('[data-action="mode"][data-value="local"]').click();
 await action(page,'play').first().click();await action(page,'quick').click();await action(page,'confirm-team').click();
 await action(page,'handoff').click();await action(page,'quick').click();await action(page,'confirm-team').click();await action(page,'begin-match').click();
}
test('雙方同時微調一度，另一方保持拖曳與鎖定，窄螢幕觸控目標不重疊',async({page})=>{
 await localLaunch(page);const secondStart=Number(await page.getByLabel('2P 發射傾角').inputValue());const cdp=await page.context().newCDPSession(page);
 const point=async(selector:string,id:number,f=.5)=>{const b=(await page.locator(selector).boundingBox())!;return{id,x:b.x+b.width*f,y:b.y+b.height/2};};
 const touch=(type:string,touchPoints:object[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 await touch('touchStart',await Promise.all([0,1].map(p=>point(`[data-action="angle-step"][data-player="${p}"][data-value="${p?1:-1}"]`,p+1))));
 await expect(page.getByLabel('1P 發射傾角')).toHaveValue('9');await expect(page.getByLabel('2P 發射傾角')).toHaveValue(String(secondStart+1));await touch('touchEnd',[]);
 const drag=await point('[data-angle="1"]',3,.8);await touch('touchStart',[drag]);
 await touch('touchStart',[drag,await point('[data-action="angle-step"][data-player="0"][data-value="1"]',4)]);
 await expect(page.getByLabel('1P 發射傾角')).toHaveValue('10');await touch('touchEnd',[drag]);
 await touch('touchMove',[{...drag,x:drag.x-20}]);expect(Number(await page.getByLabel('2P 發射傾角').inputValue())).toBeLessThan(24);
 await touch('touchStart',[{...drag,x:drag.x-20},await point('[data-action="lock"][data-player="0"]',5)]);
 await expect(page.getByLabel('1P 傾角增加1度')).toBeDisabled();await touch('touchEnd',[]);
 await page.getByLabel('2P 發射傾角').fill('30');await expect(page.getByLabel('2P 傾角增加1度')).toBeDisabled();
 await page.getByLabel('2P 發射傾角').fill('0');await expect(page.getByLabel('2P 傾角減少1度')).toBeDisabled();
 for(const width of [320,390,844]){
  await page.setViewportSize({width,height:width===844?390:1080});
  if(width===844){
   await page.locator('.launch-panels').scrollIntoViewIfNeeded();
   for(const p of [0,1]){const lock=(await page.locator(`[data-action="lock"][data-player="${p}"]`).boundingBox())!;expect(lock.y).toBeGreaterThanOrEqual(0);expect(lock.y+lock.height).toBeLessThanOrEqual(390);}
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const boxes=await page.locator('#battle-controls button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height};}));
  for(const b of boxes){expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
  await page.screenshot({path:`artifacts/p1-launch-${width}.png`,fullPage:true});
 }
 await cdp.detach();
});
// AudioSession/拒絕/未完成Promise為故障注入；AudioContext仍是Chrome原生。
test('音訊提示依狀態更新一次，中斷禁用重試，逾時和拒絕可重試',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'audioSession',{value:Object.assign(new EventTarget(),{state:'active'})});
  const Original=AudioContext;(window as any).AudioContext=class extends Original{constructor(){super();(window as any).probe=this;}};
 });
 await page.goto('/');await page.getByLabel('配樂設定').click();
 await expect(page.locator('#audio-status-text')).toContainText('音訊正常');
 await page.evaluate(()=>{const s=(navigator as any).audioSession;s.state='interrupted';s.dispatchEvent(new Event('statechange'));});
 await expect(page.locator('#audio-notice')).toBeVisible();await expect(page.locator('#audio-notice-text')).toContainText('音訊中斷中');
 await expect(page.getByRole('button',{name:'重試音訊',exact:true})).toBeDisabled();
 await page.evaluate(()=>{(window as any).changes=0;new MutationObserver(()=>{(window as any).changes++;}).observe(document.querySelector('#audio-notice-text')!,{subtree:true,childList:true,characterData:true});});
 await page.waitForTimeout(700);expect(await page.evaluate(()=>(window as any).changes)).toBe(0);
 await page.evaluate(async()=>{const w=window as any;w.nativeResume=w.probe.resume.bind(w.probe);await w.probe.suspend();w.probe.resume=()=>new Promise(()=>{});const s=(navigator as any).audioSession;s.state='active';s.dispatchEvent(new Event('statechange'));});
 await page.getByRole('button',{name:'重試音訊',exact:true}).click();
 await expect(page.locator('#audio-notice-text')).toContainText('音訊恢復中');
 await expect(page.locator('#audio-notice-text')).toContainText('音訊尚未恢復');
 await page.evaluate(()=>{(window as any).probe.resume=()=>Promise.reject(Error('synthetic refusal'));});
 await page.getByRole('button',{name:'重試音訊',exact:true}).click();await expect(page.locator('#audio-notice-text')).toContainText('音訊尚未恢復');
 await page.evaluate(()=>{const w=window as any;w.probe.resume=w.nativeResume;});
 await page.getByRole('button',{name:'重試音訊',exact:true}).click();await expect(page.locator('#audio-notice')).toBeHidden();
 await expect(page.locator('#audio-status-text')).toContainText('音訊正常');
});
test('配樂載入失敗後鍵盤重試，不誤觸發射或呼喊，成功後只播放一份',async({page})=>{
 let blocked=true,requests=0;
 await page.route('**/audio/*.mp3',async route=>{requests++;if(blocked)await route.abort();else await route.continue();});
 await localLaunch(page);
 await expect(page.locator('#audio-notice-text')).toContainText('配樂載入失敗');
 const retry=page.getByRole('button',{name:'重試音訊',exact:true});
 await retry.focus();const before=requests;await page.keyboard.press('Space');
 await expect.poll(()=>requests).toBeGreaterThan(before);await expect(page.locator('#app')).toHaveAttribute('data-screen','launch');
 for(const p of [0,1])await expect(page.locator(`[data-action="lock"][data-player="${p}"]`)).toBeEnabled();
 await page.locator('[data-action="lock"][data-player="0"]').click();await page.locator('[data-action="lock"][data-player="1"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
 await expect(page.locator('#audio-notice-text')).toContainText('配樂載入失敗');
 blocked=false;await retry.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#audio-notice')).toBeHidden();
 for(const p of [0,1])await expect(page.locator(`#shout-${p}`)).toBeEnabled();
 await page.getByLabel('配樂設定').click();await page.getByRole('button',{name:'裝置檢查',exact:true}).click();
 await expect(page.locator('#device-check-summary')).toContainText('音訊');
});
