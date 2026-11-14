import{test,expect,type Page}from'@playwright/test';import{readFileSync}from'node:fs';
test.setTimeout(90000);
async function preview(page:Page){const m=JSON.parse(readFileSync('tests/fixtures/v5-match.json','utf8')),count={played:0,wins:0,streak:0,bestStreak:0};await page.locator('#backup-file').setInputFiles({name:'v5.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,modes:{cpu:[count,count],local:[count,count]},beys:{},matrix:{},finishes:{spin:0,burst:0,over:0,extreme:0},recent:[m],highs:[]}))});}
test('備份預覽取消不覆蓋，確認後保留v5重播並可跳轉關鍵碰撞',async({page})=>{
 await page.goto('/');await page.locator('[data-action="stats"]').click();await preview(page);
 await expect(page.getByRole('dialog')).toContainText('匯入備份預覽');await expect(page.locator('.history-row')).toHaveCount(0);
 await page.getByRole('button',{name:'取消匯入',exact:true}).click();await expect(page.locator('.history-row')).toHaveCount(0);
 await preview(page);await page.getByRole('button',{name:'確認覆蓋匯入',exact:true}).click();await expect(page.locator('.history-row')).toHaveCount(1);
 await page.locator('.history-row > summary').click();await page.locator('[data-action="replay"]').first().click();
 await expect(page.getByLabel('重播時間')).toBeVisible();await page.getByLabel('重播時間').fill('5');await page.getByLabel('重播時間').dispatchEvent('change');
 await expect(page.locator('#pause-overlay')).toBeVisible();await expect(page.locator('#replay-position')).toContainText('5.0');
 await page.getByRole('button',{name:'俯視鏡位',exact:true}).click();await expect(page.getByRole('button',{name:'俯視鏡位',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-action="replay-moment"]').last().click();await expect(page.locator('#replay-position')).toContainText('/');
 await page.locator('[data-action="replay-moment"]').first().click();await expect(page.locator('#replay-position')).toContainText('0.0');
 const end=Number(await page.getByLabel('重播時間').getAttribute('max'));
 await page.getByLabel('重播時間').fill(String(Math.floor((end-.2)*10)/10));await page.getByLabel('重播時間').dispatchEvent('change');await page.locator('#pause-button').click();
 await expect(page.locator('.finish-card')).toBeVisible();await page.locator('#pause-button').click();await expect(page.locator('#pause-overlay')).toBeVisible();
 expect(Number(await page.getByLabel('重播時間').inputValue())).toBeGreaterThan(end-1);
 await page.locator('#pause-button').click();await expect(page.locator('#pause-button')).toHaveText('從頭重播');await page.locator('#pause-button').click();
 expect(Number(await page.getByLabel('重播時間').inputValue())).toBeLessThan(1);
});
test('備份提交中會停用取消與Escape，完成後才顯示已匯入',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any,add=IDBTransaction.prototype.addEventListener;w.heldWrites=[];
  IDBTransaction.prototype.addEventListener=function(type:string,listener:any,options:any){
   if(type==='complete'&&this.mode==='readwrite')return add.call(this,type,(event:Event)=>{const invoke=()=>typeof listener==='function'?listener.call(this,event):listener.handleEvent(event);if(w.holdWrites)w.heldWrites.push(invoke);else invoke();},options);
   return add.call(this,type,listener,options);
  };
 });
 await page.goto('/');await page.locator('[data-action="stats"]').click();await preview(page);await page.evaluate(()=>(window as any).holdWrites=true);
 await page.getByRole('button',{name:'確認覆蓋匯入',exact:true}).click();await expect(page.getByRole('button',{name:'取消匯入',exact:true})).toBeDisabled();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toContainText('儲存中');
 await page.evaluate(()=>{const w=window as any;w.holdWrites=false;for(const invoke of w.heldWrites.splice(0))invoke();});
 await expect(page.locator('.history-row')).toHaveCount(1);await expect(page.locator('#toast')).toContainText('已匯入');
});
test('發射練習可選左右旋、調整發射及重練，不增加戰績',async({page})=>{
 await page.goto('/');await page.locator('[data-action="stats"]').click();
 const beforeDownload=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const before=JSON.parse(readFileSync((await(await beforeDownload).path())!,'utf8'));
 await page.locator('[data-action="home"]').first().click();await page.getByRole('button',{name:'發射練習與教學',exact:true}).click();
 await expect(page.locator('#practice-guide')).toBeVisible();await page.getByLabel('練習陀螺').selectOption('bx-34-cobalt-dragoon');
 await expect(page.locator('#practice-guide')).toContainText('左迴旋');await page.getByLabel('1P 發射傾角').fill('25');
 await page.locator('[data-action="lane"][data-value="2"]').click();await page.locator('[data-action="lock"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
 while((await page.locator('#speed-button').textContent())!=='4×')await page.locator('#speed-button').click();
 await page.getByRole('button',{name:'再練一次',exact:true}).waitFor({timeout:45000});
 await expect(page.locator('#main')).toContainText('不計入戰績');await page.getByRole('button',{name:'再練一次',exact:true}).click();await expect(page.locator('#app')).toHaveAttribute('data-screen','launch');
 await page.locator('[data-action="exit"]').click();await page.locator('[data-action="confirm-exit"]').click();await page.locator('[data-action="stats"]').click();await expect(page.locator('.history-row')).toHaveCount(0);
 const afterDownload=page.waitForEvent('download');await page.locator('[data-action="export"]').click();expect(JSON.parse(readFileSync((await(await afterDownload).path())!,'utf8'))).toEqual(before);
});
test('三款精修模型可由側面與底面辨識，手機練習版面不溢出',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:900});await page.goto('/');
 await page.locator('[data-action="catalog"]').first().click();
 for(const name of ['Cobalt Dragoon','Black Shell','Samurai Saber']){
  await page.getByRole('searchbox').fill(name);await page.locator('.art-button').first().click();
  for(const view of ['model-side','model-bottom']){await page.locator(`[data-action="${view}"]`).click();await page.waitForTimeout(500);await page.locator('.detail-layout').screenshot({path:`artifacts/p2-${name.replaceAll(' ','-')}-${view}.png`});}
  await page.keyboard.press('Escape');
 }
 await page.locator('[data-action="home"]').first().click();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'發射練習與教學',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/p2-practice-mobile.png',fullPage:true});expect(errors).toEqual([]);
});
