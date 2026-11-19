import{test,expect}from'@playwright/test';
import{readFile}from'node:fs/promises';
import{GAME_VERSION}from'../../src/diagnostics.ts';
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
async function open(page:any){if(!await page.locator('.music-controls').evaluate((n:HTMLDetailsElement)=>n.open))await page.getByLabel('配樂設定',{exact:true}).click();await page.getByRole('button',{name:'裝置檢查',exact:true}).click();}
async function download(page:any,name:string){const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8'));}
test('停止後重開可匯出原診斷，清除保存不影響現有戰績',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await open(page);await page.getByRole('button',{name:'開始新紀錄',exact:true}).click();await open(page);await page.getByLabel('藍牙耳機切換',{exact:true}).selectOption('fail');await page.getByRole('button',{name:'停止紀錄',exact:true}).click();const original=await download(page,'匯出檢查紀錄');
 const beforeReload=await download(page,'匯出保存紀錄');await page.reload();await open(page);await expect(page.locator('#device-draft-status')).toContainText('上次保存');await expect(page.getByLabel('藍牙耳機切換',{exact:true})).toHaveValue('untested');const saved=await download(page,'匯出保存紀錄');
 for(const key of ['version','frames','activeMs','checks','userAgent','viewport'])expect(saved[key]).toEqual(original[key]);expect(saved.audio).toEqual(beforeReload.audio);expect(saved.draft).toEqual(beforeReload.draft);expect(saved.running).toBe(false);expect(saved.draft.interrupted).toBe(false);expect(saved.profile).toBeUndefined();await page.screenshot({path:'artifacts/diagnostic-draft-mobile-v0430.png',fullPage:true});
 await page.getByRole('button',{name:'清除保存紀錄',exact:true}).click();await page.reload();await open(page);await expect(page.getByRole('button',{name:'匯出保存紀錄',exact:true})).toBeDisabled();await expect(page.locator('#device-draft-status')).toContainText('尚無保存');expect(errors).toEqual([]);
});
test('背景立即保存未完成紀錄，重開不自行續錄或變成實機通過',async({page})=>{
 await page.goto('/');await open(page);await page.getByRole('button',{name:'開始新紀錄',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.reload();await open(page);
 await expect(page.locator('#device-draft-status')).toContainText('已中止');const saved=await download(page,'匯出保存紀錄');expect(saved.running).toBe(false);expect(saved.draft.interrupted).toBe(true);expect(Object.values(saved.checks).every(v=>v==='untested')).toBe(true);await expect(page.getByRole('button',{name:'開始新紀錄',exact:true})).toBeVisible();
});
test('保存遭拒時明確提示並可直接匯出，不阻止開局',async({page})=>{
 await page.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='spinforge-device-draft-v1')throw new DOMException('quota','QuotaExceededError');return set.call(this,k,v);};});
 await page.goto('/');await open(page);await page.getByRole('button',{name:'開始新紀錄',exact:true}).click();await open(page);await expect(page.locator('#device-draft-status')).toContainText('無法保存');await page.getByRole('button',{name:'停止紀錄',exact:true}).click();expect((await download(page,'匯出檢查紀錄')).version).toBe(GAME_VERSION);await page.getByLabel('關閉裝置檢查',{exact:true}).click();await page.locator('[data-action=quick-battle]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
});
test('沿用既有更新循環定期保存，不必等待離開頁面',async({page})=>{
 await page.goto('/');await open(page);await page.getByRole('button',{name:'開始新紀錄',exact:true}).click();await open(page);await expect(page.locator('#device-draft-status')).toContainText(/· (?:[5-9]|\d{2,})秒/,{timeout:15000});
 const saved=await download(page,'匯出保存紀錄');expect(saved.elapsedMs).toBeGreaterThanOrEqual(5000);expect(saved.running).toBe(false);expect(saved.draft.interrupted).toBe(true);
});
