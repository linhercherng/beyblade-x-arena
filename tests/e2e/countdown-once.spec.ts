import {test,expect,type Page} from '@playwright/test';
import{writeFileSync}from'node:fs';
const action=(p:Page,a:string)=>p.locator(`[data-action="${a}"]`);
test('開場倒數每個數字只更新一次，交戰後不重播且階段文字不反覆提醒',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).openingUpdates=[];
  new MutationObserver(records=>{for(const record of records){const el=record.target.nodeType===1?record.target as Element:record.target.parentElement;const host=el?.closest('#battle-message,#battle-phase');if(host)(window as any).openingUpdates.push({id:host.id,text:host.textContent});}}).observe(document,{subtree:true,childList:true,characterData:true});
 });
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
test('GO開場提示隨暫停凍結，恢復後才消失且不會再出現',async({page})=>{
 await page.goto('/');for(const a of ['play','quick','confirm-team','begin-match'])await action(page,a).first().click();await page.keyboard.press('Space');await expect(page.locator('#battle-message .shoot')).toBeVisible({timeout:12000});await action(page,'pause').first().click();
 const time=await page.locator('#battle-time').innerText();await page.waitForTimeout(1000);await expect(page.locator('#battle-time')).toHaveText(time);await expect(page.locator('#battle-message .shoot')).toBeVisible();
 await page.locator('#pause-overlay [data-action="pause"]').click();await expect(page.locator('#battle-message .shoot')).toHaveCount(0);await page.waitForTimeout(250);await expect(page.locator('#battle-message .shoot')).toHaveCount(0);
});
