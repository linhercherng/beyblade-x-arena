import{test,expect}from'@playwright/test';
test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
test('觸控裝置檢查可匯出且不把未測試硬體標成通過',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.getByLabel('配樂設定').tap();await page.getByRole('button',{name:'裝置檢查',exact:true}).tap();await page.getByRole('button',{name:'開始新紀錄',exact:true}).tap();
 await page.locator('[data-action="quick-battle"]').tap();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await page.waitForTimeout(700);
 await page.getByLabel('配樂設定').tap();await page.getByRole('button',{name:'裝置檢查',exact:true}).tap();await page.getByRole('button',{name:'測試聲音',exact:true}).tap();
 await expect(page.locator('#device-tone-status')).not.toHaveText('');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出檢查紀錄',exact:true}).tap();const file=await download,fs=await import('node:fs/promises');const report=JSON.parse(await fs.readFile((await file.path())!,'utf8'));
 expect(report.frames).toBeGreaterThan(0);expect(Object.values(report.checks).every(v=>v==='untested')).toBe(true);expect(report.audio.events.length).toBeLessThanOrEqual(60);expect(report.profile).toBeUndefined();
 await expect(page.locator('#pause-overlay')).toBeVisible();await page.getByLabel('關閉裝置檢查',{exact:true}).tap();await page.locator('#pause-overlay [data-action="pause"]').tap();await expect(page.locator('#pause-overlay')).toBeHidden();expect(errors).toEqual([]);
});
