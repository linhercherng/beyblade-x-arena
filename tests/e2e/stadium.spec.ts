import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
for(const mobile of [false,true])test(`${mobile?'手機':'桌面'}盤體全景、斜齒近鏡與側面凹槽可正常繪製`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
  await page.goto('/tests/fixtures/stadium.html');
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).stadiumMetrics().frames.length)).toBeGreaterThan(45);
  for(const view of ['wide','close','low']){
    await page.locator('#'+view).click();
    await page.screenshot({path:`artifacts/stadium-${mobile?'mobile':'desktop'}-${view}-v0110.png`});
  }
  const m=await page.evaluate(()=>{
    const m=(window as any).stadiumMetrics();const f=m.frames.slice(12).sort((a:number,b:number)=>a-b);
    return {...m,frames:undefined,samples:f.length,medianFrameMs:f[Math.floor(f.length*.5)],p95FrameMs:f[Math.floor(f.length*.95)]};
  });
  expect(m.teeth).toBeGreaterThanOrEqual(220);expect(m.calls).toBeLessThanOrEqual(95);
  expect(m.triangles).toBeLessThan(110000);expect(m.p95FrameMs).toBeLessThan(100);
  writeFileSync(`artifacts/stadium-${mobile?'mobile':'desktop'}-metrics-v0110.json`,JSON.stringify(m,null,2));
  expect(errors).toEqual([]);
});
