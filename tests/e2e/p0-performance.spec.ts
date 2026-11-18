import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 await page.screenshot({path:'artifacts/p0-failure-v0206.png',fullPage:true}).catch(()=>{});
 try{
  await page.locator('.music-controls').evaluate((node:HTMLDetailsElement)=>node.open=true);await page.getByRole('button',{name:'裝置檢查',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'匯出檢查紀錄',exact:true}).click();await (await pending).saveAs('artifacts/p0-failure-report-v0206.json');
 }catch{}
});
test('暫停後停止重複GPU繪製，改變尺寸仍重繪且恢復後繼續渲染',async({page})=>{
  await page.addInitScript(()=>{
    (window as any).gpuDraws=0;(window as any).audioTargets=0;
    const target=AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime=function(...args:Parameters<typeof target>){(window as any).audioTargets++;return target.apply(this,args);};
    for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
      const original=(WebGL2RenderingContext.prototype as any)[name];
      (WebGL2RenderingContext.prototype as any)[name]=function(...args:any[]){(window as any).gpuDraws++;return original.apply(this,args);};
    }
  });
  await page.goto('/');await page.locator('[data-action="quick-battle"]').tap();
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  await page.locator('#pause-button').tap();await expect(page.locator('#pause-overlay')).toBeVisible();
  await page.waitForTimeout(600);const audioBefore=await page.evaluate(()=>(window as any).audioTargets);const before=await page.evaluate(()=>(window as any).gpuDraws);
  await page.waitForTimeout(800);expect(await page.evaluate(()=>(window as any).gpuDraws)).toBe(before);expect(await page.evaluate(()=>(window as any).audioTargets)).toBe(audioBefore);
  await page.setViewportSize({width:844,height:390});await expect.poll(()=>page.evaluate(()=>(window as any).gpuDraws)).toBeGreaterThan(before);
  await page.waitForTimeout(200);const resized=await page.evaluate(()=>(window as any).gpuDraws);
  await page.waitForTimeout(500);expect(await page.evaluate(()=>(window as any).gpuDraws)).toBe(resized);
  await page.locator('#pause-overlay [data-action="pause"]').tap();await expect.poll(()=>page.evaluate(()=>(window as any).gpuDraws)).toBeGreaterThan(resized);
});

test('裝置檢查可記錄、勾選與匯出，暫停時間不列入效能',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByLabel('配樂設定').tap();await page.getByRole('button',{name:'裝置檢查',exact:true}).tap();
  await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'開始新紀錄',exact:true}).tap();
  await page.locator('[data-action="quick-battle"]').tap();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await page.waitForTimeout(1600);
  await page.getByLabel('配樂設定').tap();await page.getByRole('button',{name:'裝置檢查',exact:true}).tap();
  await expect(page.locator('#pause-overlay')).toBeVisible();await page.getByLabel('藍牙耳機切換',{exact:true}).selectOption('fail');
  await page.getByRole('button',{name:'停止紀錄',exact:true}).tap();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出檢查紀錄',exact:true}).tap();const file=await download;
  const fs=await import('node:fs/promises');const report=JSON.parse(await fs.readFile((await file.path())!,'utf8'));
  expect(report.version).toBe('0.43.0');expect(report.frames).toBeGreaterThan(10);expect(report.fps).toBeGreaterThan(0);expect(report.checks.bluetooth).toBe('fail');expect(report.checks.call).toBe('untested');expect(report.audio.events.length).toBeLessThanOrEqual(60);expect(report.profile).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/device-check-mobile-v0206.png',fullPage:true});
  await page.getByLabel('關閉裝置檢查',{exact:true}).tap();await expect(page.locator('#pause-overlay')).toBeVisible();
  await page.locator('#pause-overlay [data-action="pause"]').tap();await expect(page.locator('#pause-overlay')).toBeHidden();expect(errors).toEqual([]);
});

for(const check of ['audio','timing'])test(`無RAF暫停恢復：${check==='audio'?'聲音仍立即暫停':'統計排除中斷時間'}`,async({page})=>{
  await page.addInitScript(()=>{
    const create=AudioContext.prototype.createBufferSource,loops=new Set<AudioBufferSourceNode>();
    AudioContext.prototype.createBufferSource=function(){const source=create.call(this),disconnect=source.disconnect.bind(source);loops.add(source);source.addEventListener('ended',()=>loops.delete(source));source.disconnect=()=>{loops.delete(source);disconnect();};return source;};
    (window as any).liveLoops=()=>[...loops].filter(s=>s.loop).length;
    const request=window.requestAnimationFrame.bind(window);let held=false;const pending:FrameRequestCallback[]=[];
    window.requestAnimationFrame=cb=>request(time=>{if(held)pending.push(cb);else cb(time);});
    (window as any).holdFrames=(value:boolean)=>{held=value;if(!value)for(const cb of pending.splice(0))request(cb);};
  });
  await page.goto('/');await page.getByLabel('配樂設定').tap();await page.getByRole('button',{name:'裝置檢查',exact:true}).tap();await page.getByRole('button',{name:'開始新紀錄',exact:true}).tap();
  await page.locator('[data-action="quick-battle"]').tap();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await page.waitForTimeout(300);
  await page.evaluate(()=>(window as any).holdFrames(true));await page.waitForTimeout(100);await page.locator('#pause-button').tap();await page.waitForTimeout(1500);if(check==='audio')expect(await page.evaluate(()=>(window as any).liveLoops())).toBe(0);await page.locator('#pause-overlay [data-action="pause"]').tap();
  await page.evaluate(()=>(window as any).holdFrames(false));await page.waitForTimeout(100);
  await page.getByLabel('配樂設定').tap();await page.getByRole('button',{name:'裝置檢查',exact:true}).tap();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出檢查紀錄',exact:true}).tap();const file=await download,fs=await import('node:fs/promises');const report=JSON.parse(await fs.readFile((await file.path())!,'utf8'));
  expect(report.activeMs).toBeLessThan(1200);expect(report.maxFrameMs).toBeLessThan(1000);
});
