import {test,expect,type Page} from '@playwright/test';
import{writeFileSync}from'node:fs';
if(process.env.CI)test.use({viewport:{width:640,height:480}});
const action=(p:Page,a:string)=>p.locator(`[data-action="${a}"]`);
const observeOpening=()=>{
 (window as any).openingUpdates=[];
 new MutationObserver(records=>{for(const record of records){
  if(record.type==='childList'&&![...record.addedNodes,...record.removedNodes].some(n=>n.textContent?.trim()))continue;
  const el=record.target.nodeType===1?record.target as Element:record.target.parentElement;const host=el?.closest('#battle-message,#battle-phase');if(host)(window as any).openingUpdates.push({id:host.id,text:host.textContent});
 }}).observe(document,{subtree:true,childList:true,characterData:true});
};
test('開場倒數每個數字只更新一次，交戰後不重播且階段文字不反覆提醒',async({page})=>{
 await page.addInitScript(observeOpening);
 await page.goto('/');for(const a of ['play','quick','confirm-team','begin-match'])await action(page,a).first().click();await page.keyboard.press('Space');
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
 await expect.poll(async()=>parseFloat(await page.locator('#battle-time').innerText())).toBeGreaterThan(2);
 await expect(page.getByRole('timer',{name:'對決經過時間'})).toHaveAttribute('aria-live','off');
 const log=await page.evaluate(()=>(window as any).openingUpdates as {id:string;text:string}[]),counts=log.filter(e=>e.id==='battle-message'&&/^[123]READY/.test(e.text));
 writeFileSync('artifacts/countdown-updates-v0171.json',JSON.stringify(log,null,2));
 expect(counts.map(e=>e.text[0])).toEqual(['3','2','1']);expect(log.filter(e=>e.id==='battle-message'&&e.text==='GO SHOOT!')).toHaveLength(1);
 const phase=page.locator('#battle-phase');await expect(phase).toContainText('開場穩定期');const before=await page.evaluate(()=>(window as any).openingUpdates.filter((e:any)=>e.id==='battle-phase').length);
 const initial=parseFloat(await page.locator('#battle-time').innerText());await page.waitForTimeout(700);expect(parseFloat(await page.locator('#battle-time').innerText())).toBeGreaterThan(initial);
 expect(await page.evaluate(()=>(window as any).openingUpdates.filter((e:any)=>e.id==='battle-phase').length)).toBe(before);await expect(page.locator('#battle-message .shoot')).toHaveCount(0);
});

test('文字觀測忽略空裝飾，但保留同批次重複文字寫入與清除',async({page})=>{
 await page.addInitScript(observeOpening);await page.goto('/');
 const first=await page.evaluate(async()=>{const host=document.createElement('div');host.id='battle-message';document.body.append(host);host.innerHTML='<strong>GO SHOOT!</strong>';host.innerHTML='<strong>GO SHOOT!</strong>';const decoration=document.createElement('i');decoration.setAttribute('aria-hidden','true');host.append(decoration);decoration.remove();await Promise.resolve();return(window as any).openingUpdates;});
 expect(first.map((e:any)=>e.text)).toEqual(['GO SHOOT!','GO SHOOT!']);
 const rest=await page.evaluate(async()=>{const host=document.getElementById('battle-message')!;host.textContent='';await Promise.resolve();host.textContent='GO SHOOT!';await Promise.resolve();(host.firstChild as Text).data='GO SHOOT!';await Promise.resolve();return(window as any).openingUpdates;});
 expect(rest.map((e:any)=>e.text)).toEqual(['GO SHOOT!','GO SHOOT!','','GO SHOOT!','GO SHOOT!']);
});
test('GO開場提示隨暫停凍結，恢復後才消失且不會再出現',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any,request=window.requestAnimationFrame.bind(window),pending:FrameRequestCallback[]=[];let armed=true,resumed=0;
  window.requestAnimationFrame=cb=>request(time=>{if(armed&&document.querySelector('#battle-message[data-launch-age] .shoot'))pending.push(cb);else{if(!armed)resumed++;cb(time);}});
  w.goPauseFrames=()=>({held:pending.length,resumed});
  w.releaseGoPause=()=>{armed=false;for(const cb of pending.splice(0))window.requestAnimationFrame(cb);};
 });
 try{
  await page.goto('/');for(const a of ['play','quick','confirm-team','begin-match'])await action(page,a).first().click();await page.keyboard.press('Space');
  await expect.poll(()=>page.evaluate(()=>(window as any).goPauseFrames().held),{timeout:12000}).toBeGreaterThan(0);
  await expect(page.locator('#battle-message .shoot')).toBeVisible();await expect(page.locator('#pause-overlay')).toBeHidden();expect(parseFloat(await page.locator('#battle-time').innerText())).toBeLessThan(1.1);
  await action(page,'pause').first().click();await expect(page.locator('#pause-overlay')).toBeVisible();
  // 放行後由遊戲暫停維持凍結，不能讓測試的RAF攔截替產品通過斷言。
  await page.evaluate(()=>(window as any).releaseGoPause());
  const time=await page.locator('#battle-time').innerText();await page.waitForTimeout(1000);const frames=await page.evaluate(()=>(window as any).goPauseFrames());expect(frames.held).toBe(0);expect(frames.resumed).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#battle-time')).toHaveText(time);await expect(page.locator('#battle-message .shoot')).toBeVisible();
  await page.locator('#pause-overlay [data-action="pause"]').click();await expect(page.locator('#battle-message .shoot')).toHaveCount(0);await page.waitForTimeout(250);await expect(page.locator('#battle-message .shoot')).toHaveCount(0);
 }finally{await page.evaluate(()=>(window as any).releaseGoPause?.()).catch(()=>{});}
});
