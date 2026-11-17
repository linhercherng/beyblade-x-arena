import{test,expect,type Page}from'@playwright/test';import{writeFileSync}from'node:fs';
const metrics=(p:Page)=>p.evaluate(()=>(window as any).highlightMetrics());
const fixture='/tests/fixtures/highlight.html'+(process.env.CI?'?software-gpu':'');
test('全場視角追蹤時整段盤體與接盤均完整入框',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(fixture);await page.locator('#whole').click();
 for(const kind of ['over','extreme','burst']){await page.locator('#'+kind).click();await page.locator('#sweep').click();const m=await metrics(page);expect(m.maxBoardExtent).toBeLessThan(1);expect(m.maxExtent).toBeLessThan(1);expect(m.sourceStable).toBe(true);}
});
test('撞擊與終結定格不推進動作，鏡頭可追蹤，手動暫停仍精確凍結',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(fixture);await page.locator('#extreme').click();await page.locator('#impact').click();const hit=await metrics(page);expect(hit.moment).toBe('impact');await expect(page.locator('#phase')).toHaveText('關鍵撞擊 · 定格回看');
 await page.locator('#tiny').click();const tracked=await metrics(page);expect(tracked.motionDt).toBe(0);expect(tracked.positions).toEqual(hit.positions);expect(tracked.camera).not.toEqual(hit.camera);await page.waitForTimeout(120);expect((await metrics(page)).camera).toEqual(tracked.camera);
 await page.screenshot({path:'artifacts/highlight-impact-hold-mobile-v0160.png'});
 await page.locator('#terminal').click();const finish=await metrics(page);expect(finish.moment).toBe('finish');expect(finish.motionDt).toBe(0);await expect(page.locator('#phase')).toHaveText('極限終結 · 決勝瞬間');await page.locator('#tiny').click();expect((await metrics(page)).positions).toEqual(finish.positions);expect((await metrics(page)).sourceStable).toBe(true);
 await page.screenshot({path:'artifacts/highlight-finish-hold-mobile-v0160.png'});
});
test('手機完整精彩重播的追擊與終結全段不裁切模型',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(fixture);
 for(const kind of ['over','burst','extreme']){await page.locator('#'+kind).click();await page.locator('#sweep').click();const m=await metrics(page);expect(m.maxExtent).toBeLessThan(1);expect(m.geometryStable).toBe(true);expect(m.sourceStable).toBe(true);}
});
test('三種終結精彩重播具追擊與終結鏡位，插值與暫停連續且原結果不變',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:800});await page.goto(fixture);
 for(const kind of ['burst','over','extreme']){
  await page.locator('#'+kind).click();await page.waitForTimeout(350);await page.locator('#pause').click();const frozen=await metrics(page);expect(frozen.shot).toBe('approach');expect(frozen.duration).toBeLessThanOrEqual(7.9);await page.waitForTimeout(100);expect((await metrics(page)).age).toBe(frozen.age);expect((await metrics(page)).camera).toEqual(frozen.camera);
  await page.screenshot({path:`artifacts/highlight-${kind}-approach-v0150.png`});await page.locator('#finish').click();const f=await metrics(page);expect(f.shot).toBe('finish');expect(f.geometryStable).toBe(true);expect(f.sourceStable).toBe(true);expect(f.bounds.every((v:number[])=>Math.abs(v[0])<1&&Math.abs(v[1])<1)).toBe(true);await page.screenshot({path:`artifacts/highlight-${kind}-finish-v0150.png`});
  await page.locator('#end').click();const done=await metrics(page);expect(done.sourceStable).toBe(true);expect(done.geometryStable).toBe(true);expect(done.size).toBeLessThanOrEqual(92);
 }
 expect(errors).toEqual([]);
});
test('手機精彩重播可跳過並清理音效，持續播放取樣不超出資源上限',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(fixture);await page.locator('#extreme').click();
 if(process.env.CI)await expect.poll(()=>page.evaluate(()=>(window as any).highlightFrameCount())).toBeGreaterThan(50);else await page.waitForTimeout(2000);
 const m=await metrics(page),frames=m.frames.slice(15).sort((a:number,b:number)=>a-b);expect(m.renderProfile.softwareGpu).toBe(!!process.env.CI);if(process.env.CI){expect(m.renderProfile.pixelRatio).toBe(.25);expect(m.renderProfile.width).toBe(Math.floor(390*.25));expect(m.renderProfile.height).toBe(Math.floor(844*.25));}
 expect(frames.length).toBeGreaterThan(35);expect(frames[Math.floor(frames.length*.95)]).toBeLessThan(100);expect(m.particles).toBeLessThanOrEqual(360);expect(m.geometryStable).toBe(true);expect(m.peak).toBeLessThan(.95);
 await page.locator('#extreme').click();await page.locator('#finish').click();await expect.poll(async()=>(await metrics(page)).cueRates[0]).toBeCloseTo(.55,4);await page.locator('#skip').click();await expect(page.locator('#phase')).toHaveText('已跳過');const skipped=await metrics(page);expect(skipped.shot).toBe(null);expect(skipped.cues+skipped.impacts+skipped.dashes).toBe(0);expect(skipped.sourceStable).toBe(true);
 writeFileSync(process.env.CI?'artifacts/highlight-software-gpu-v0420.json':'artifacts/highlight-performance-v0150.json',JSON.stringify({profile:m.renderProfile,samples:frames.length,median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],peak:m.peak,geometryStable:m.geometryStable},null,2));
});
test('實際遊戲自動精彩重播可暫停並一鍵跳過，只結算原結果一次',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{Object.defineProperty(crypto,'getRandomValues',{value:(a:Uint32Array)=>{a.fill(7181);return a;}});});
 const action=(a:string)=>page.locator(`[data-action="${a}"]`);await page.goto('/');await action('play').first().click();await action('quick').click();await action('confirm-team').click();await action('begin-match').click();
 let found=false,rounds=0;
 for(let i=0;i<6;i++){
  rounds++;
  await page.keyboard.press('Space');await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});while(await action('speed').textContent()!=='4×')await action('speed').click();
  await expect(page.locator('#highlight-panel,[data-action="next-round"],[data-action="rematch"]').first()).toBeVisible({timeout:45000});
  if(await page.locator('#highlight-panel').isVisible()){
   await expect(page.locator('#highlight-type')).toContainText(/爆裂終結|越界終結|極限終結/);
   found=true;await action('pause').first().click();const progress=await page.locator('#highlight-progress').getAttribute('style');await page.waitForTimeout(120);expect(await page.locator('#highlight-progress').getAttribute('style')).toBe(progress);
   const signatures=page.getByRole('group',{name:'陀螺旋向與軸心特徵'});await expect(signatures.locator('span')).toHaveCount(2);
   await expect(signatures).toContainText(/左迴旋|右迴旋/);expect(await signatures.evaluate(el=>{const r=el.getBoundingClientRect(),panel=el.closest('section')!.getBoundingClientRect();return r.left>=panel.left&&r.right<=panel.right;})).toBe(true);
   await page.screenshot({path:'artifacts/highlight-paused-mobile-v0150.png'});await action('pause').first().click();await page.screenshot({path:'artifacts/highlight-live-mobile-v0150.png'});await action('pause').first().click();await action('skip-highlight').click();await expect(page.locator('#highlight-panel')).toHaveCount(0);await expect(page.locator('.round-result,.result-hero')).toBeVisible();
   if(await page.locator('.round-result').isVisible())await expect(page.locator('.round-result .eyebrow')).toHaveText(`ROUND ${rounds} COMPLETE`);else await expect(page.locator('.report-panel table').first().locator('tbody tr')).toHaveCount(rounds);break;
  }
  if(await action('next-round').isVisible())await action('next-round').click();else{rounds=0;await action('rematch').click();}
 }
 expect(found).toBe(true);expect(errors).toEqual([]);
});
