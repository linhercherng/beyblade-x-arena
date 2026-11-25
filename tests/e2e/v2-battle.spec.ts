import{test,expect}from'@playwright/test';
import{readFileSync}from'node:fs';
import{profileGame}from'./game-render-profile.ts';

for(const local of[false,true])test(`${local?'手機雙人':'桌機單人'}V2可組隊完成對戰，備份與獨立模型重播一致`,async({page})=>{
 test.setTimeout(process.env.CI?600000:240000);
 await profileGame(page);
 const errors:string[]=[],action=(a:string)=>page.locator(`[data-action="${a}"]`);
 page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize(local?{width:390,height:900}:{width:1440,height:1000});
 await page.addInitScript(()=>{let seed=20261125;Object.defineProperty(crypto,'getRandomValues',{value:(v:Uint32Array)=>{v.fill(seed++);return v;}});});
 await page.goto(process.env.CI?'/?software-gpu':'/');
 if(local)await page.locator('[data-action="mode"][data-value="local"]').click();
 await action('play').first().click();
 const ids=['bx-00-dran-sword-v2','cx-20-hells-scythe-v2','bx-03-wizard-arrow'];
 for(const id of ids)await page.locator(`[data-action="select"][data-id="${id}"]`).click();
 await action('confirm-team').click();
 if(local){
  await action('handoff').click();
  for(const id of[ids[1],ids[0],ids[2]])await page.locator(`[data-action="select"][data-id="${id}"]`).click();
  await action('confirm-team').click();
 }
 await action('begin-match').click();
 let finished=false;
 for(let round=0;round<14;round++){
  for(const button of await action('lock').all())await button.click();
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:30000});
  if(round===0){
   await expect(page.locator('.fighter-0')).toContainText('蒼龍神劍 V2');
   if(local){await expect(page.locator('.fighter-1')).toContainText('惡魔紅鐮 V2');await expect(page.locator('.fighter-1')).toContainText('遊戲搭配 4-60T');}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`artifacts/v2-battle-${local?'mobile':'desktop'}.png`});
  }
  while(await action('speed').textContent()!=='4×')await action('speed').click();
  await expect(page.locator('#highlight-panel,[data-action="next-round"],[data-action="rematch"]').first()).toBeVisible({timeout:90000});
  if(await action('skip-highlight').isVisible())await action('skip-highlight').click();
  await expect(page.locator('[data-action="next-round"],[data-action="rematch"]').first()).toBeVisible({timeout:30000});
  if(await action('rematch').isVisible()){finished=true;break;}
  await action('next-round').click();
 }
 expect(finished).toBe(true);
 await action('stats').click();await expect(page.locator('.history-row')).toHaveCount(1);
 const download=page.waitForEvent('download');await action('export').click();
 const backup=await download,path=`artifacts/v2-${local?'local':'cpu'}-backup.json`;await backup.saveAs(path);
 const data=JSON.parse(readFileSync(path,'utf8')),match=data.recent[0];
 expect(match.teams[0]).toEqual(ids);expect(match.rounds.every((r:any)=>r.engineVersion===7&&r.traitVersion===1)).toBe(true);
 expect(match.rounds[0].beys[0]).toBe(ids[0]);
 await page.locator('#backup-file').setInputFiles(path);await page.getByRole('button',{name:'確認覆蓋匯入',exact:true}).click();
 await expect(page.locator('#toast')).toContainText('已匯入');
 await page.locator('.history-row > summary').click();await action('replay').first().click();
 await expect(page.locator('.fighter-0')).toContainText('蒼龍神劍 V2');
 while(await action('speed').textContent()!=='4×')await action('speed').click();
 await expect(page.locator('#toast')).toContainText('結果與原對戰一致',{timeout:90000});
 await action('exit').click();await expect(page.locator('.history-row')).toHaveCount(1);
 expect(errors).toEqual([]);
});
