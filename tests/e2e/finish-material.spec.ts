import{test,expect}from'@playwright/test';
const metrics=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).finishMaterialMetrics());
async function open(page:import('@playwright/test').Page){await page.goto('/tests/fixtures/finish-material-audio.html');await page.locator('#enable').click();await expect.poll(async()=>(await metrics(page)).ready).toBe(true);}
test('四種終結×三材質預熱快取，慢放頻寬與速率一致，沿用單一終結聲部',async({page})=>{
 await open(page);expect((await metrics(page)).cache).toBe(17);
 for(const kind of ['burst','over','extreme','spin'])for(const material of ['metal','plastic','rubber']){
  const m=await page.evaluate(({kind,material})=>(window as any).finishMaterial(kind,material,.55,true),{kind,material});expect(m.cues).toHaveLength(1);expect(m.cues[0].key).toBe(`${kind}:${material}`);expect(m.cues[0].initialRate).toBeCloseTo(.55,5);expect(m.cues[0].startCutoff).toBeCloseTo(({metal:3600,plastic:2600,rubber:1250}[material]!)*.55,3);if(kind==='spin')expect(m.cues[0].duration).toBeCloseTo(1.65,5);expect(m.tails).toBeLessThanOrEqual(1);
 }
 await expect.poll(async()=>(await metrics(page)).cues[0]?.rate??0).toBeCloseTo(.55,4);expect((await metrics(page)).maxLive).toBeLessThanOrEqual(2);await page.locator('#stop').click();await expect.poll(async()=>(await metrics(page)).live).toBe(0);expect((await metrics(page)).peak).toBeLessThan(.95);
});
test('快速切換終結與重播定位最多保留一個淡出尾音，清理後不疊播或爆音',async({page})=>{
 await open(page);await page.evaluate(()=>{for(let i=0;i<40;i++)(window as any).finishMaterial(['burst','over','extreme','spin'][i%4],['metal','plastic','rubber'][i%3],.55,true);});expect((await metrics(page)).maxLive).toBeLessThanOrEqual(2);await expect.poll(async()=>(await metrics(page)).peak).toBeGreaterThan(.001);expect((await metrics(page)).peak).toBeLessThan(.95);await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).live).toBe(0);
});
test('停轉接續慢速碰撞後平滑回原速與材質頻寬，尾音播完才恢復配樂',async({page})=>{
 await open(page);const m=await page.evaluate(()=>(window as any).finishMaterial('spin','metal',.35,false));expect(m.cues[0].initialRate).toBeCloseTo(.35,5);expect(m.cues[0].startCutoff).toBeLessThan(2160);await expect.poll(async()=>(await metrics(page)).cues[0]?.rate??1).toBeCloseTo(1,3);await expect.poll(async()=>(await metrics(page)).cues.length).toBe(0);await expect.poll(async()=>(await metrics(page)).musicDuck).toBeGreaterThan(.98);expect((await metrics(page)).peak).toBeLessThan(.95);
});
test('背景與裝置中斷清空材質終結及淡出尾音，手勢恢復不補播',async({page})=>{
 await open(page);await page.evaluate(()=>(window as any).finishMaterial('burst','metal',.55,true));expect((await metrics(page)).live).toBe(1);await page.evaluate(()=>(window as any).finishMaterialSound.setBackground(true));expect((await metrics(page)).live).toBe(0);expect((await metrics(page)).tails).toBe(0);
 await page.evaluate(()=>(window as any).finishMaterialSound.setBackground(false));await page.locator('#enable').click();await expect.poll(async()=>(await metrics(page)).ready).toBe(true);expect((await metrics(page)).live).toBe(0);await page.evaluate(()=>(window as any).finishMaterial('over','rubber',.55,true));expect((await metrics(page)).cues[0].key).toBe('over:rubber');await page.evaluate(()=>navigator.mediaDevices.dispatchEvent(new Event('devicechange')));expect((await metrics(page)).live).toBe(0);expect((await metrics(page)).tails).toBe(0);await page.locator('#enable').click();await expect.poll(async()=>(await metrics(page)).ready).toBe(true);expect((await metrics(page)).live).toBe(0);
});
