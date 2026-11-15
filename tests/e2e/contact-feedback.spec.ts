import{test,expect}from'@playwright/test';
const metrics=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).feedbackMetrics());
test('擦碰與正撞有方向性回彈，連續接觸不重設姿勢，貼盤且不改物理',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:640,height:480});await page.goto('/tests/fixtures/contact-feedback.html');
 await page.locator('#light').click();const light=await metrics(page);await page.locator('#advance').click();const scrape=await metrics(page);
 await page.locator('#head').click();const head=await metrics(page);expect(head.shake).toBeGreaterThan(light.shake*3);expect(head.particles).toBeGreaterThan(light.particles);await page.locator('#advance').click();const kick=await metrics(page);
 expect(kick.up[0][0]).toBeLessThan(0);expect(kick.up[1][0]).toBeGreaterThan(0);expect(Math.abs(kick.up[0][0]-head.up[0][0])).toBeGreaterThan(Math.abs(scrape.up[0][0]-light.up[0][0])*3);expect(kick.gaps.every((v:number)=>v>=.0039)).toBe(true);expect(kick.state).toBe(head.state);
 await page.screenshot({path:'artifacts/contact-head-v0290.png'});await page.locator('#repeat').click();expect((await metrics(page)).quaternions).toEqual(kick.quaternions);
 await page.locator('#rapid').click();const rapid=await metrics(page);expect(rapid.queue).toBeLessThanOrEqual(8);expect(rapid.particles).toBeLessThanOrEqual(360);expect(rapid.voices).toBeLessThanOrEqual(5);
 await page.locator('#rest').click();const rest=await metrics(page);expect(rest.up.every((v:number[],i:number)=>Math.hypot(...v.map((n,j)=>n-head.up[i][j]))<.002)).toBe(true);expect(rest.state).toBe(head.state);expect(rest.geometries).toEqual(head.geometries);await page.locator('#reset').click();expect((await metrics(page)).queue).toBe(0);expect(errors).toEqual([]);
});
test('左右旋反彈各自進動，擦碰音色受控且聲源結束後清理',async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.goto('/tests/fixtures/contact-feedback.html');await page.locator('#opposed').click();await page.locator('#advance').click();const opposed=await metrics(page);
 expect(opposed.up[0][2]*opposed.up[1][2]).toBeGreaterThan(0);expect(opposed.up[0][0]*opposed.up[1][0]).toBeLessThan(0);await page.screenshot({path:'artifacts/contact-opposed-v0290.png'});
 await expect.poll(async()=>(await metrics(page)).voices).toBe(0);await page.locator('#light').click();const light=await metrics(page);expect(light.cutoff).toBeGreaterThanOrEqual(1600);expect(light.cutoff).toBeLessThan(2200);expect(Math.max(...light.gains)).toBeLessThan(.4);await expect.poll(async()=>(await metrics(page)).voices).toBe(0);expect((await metrics(page)).disconnects).toBeGreaterThan(0);
});
test('減少動態不加入反彈傾斜或震動，手機資源有界',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/tests/fixtures/contact-feedback.html');await page.locator('#head').click();const before=await metrics(page);await page.locator('#advance').click();const after=await metrics(page);expect(after.up).toEqual(before.up);expect(after.shake).toBe(0);expect(after.particles).toBeLessThanOrEqual(8);expect(after.state).toBe(before.state);
});
