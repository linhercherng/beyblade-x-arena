import{test,expect}from'@playwright/test';
const delta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
test('真實3D模型由頂視投影確認右順時針、左逆時針，開場及勝者旋向一致',async({page})=>{
 await page.goto('/tests/fixtures/spin-direction.html');const metrics=()=>page.evaluate(()=>(window as any).spinMetrics());
 for(const mode of ['live','opening','home','winner-0','winner-1']){
  await page.locator('#'+mode).click();const before=await metrics();await page.locator('#step').click();const after=await metrics();expect(after.stable).toBe(true);
  if(mode!=='winner-1')expect(delta(before.angles[0],after.angles[0])).toBeLessThan(0);
  if(mode!=='winner-0')expect(delta(before.angles[1],after.angles[1])).toBeGreaterThan(0);
 }
});
for(const mobile of [false,true])test(`${mobile?'手機':'桌機'}對戰名牌顯示左／右迴旋與推定標示且不溢出`,async({page})=>{
 await page.setViewportSize(mobile?{width:390,height:844}:{width:1280,height:900});const action=(a:string)=>page.locator(`[data-action="${a}"]`);await page.goto('/');await page.locator('[data-action="mode"][data-value="local"]').click();await action('play').first().click();
 for(const id of ['bx-34-cobalt-dragoon','bx-52-luster-dragoon','ux-17-meteor-dragoon'])await page.locator(`[data-action="select"][data-id="${id}"]`).click();await action('confirm-team').click();await action('handoff').click();
 for(const id of ['cx-00-valkyrie-volt-slash','bx-01-dran-sword','bx-02-hells-scythe'])await page.locator(`[data-action="select"][data-id="${id}"]`).click();await action('confirm-team').click();await action('begin-match').click();
 const left=page.locator('.fighter-0 .spin-badge'),right=page.locator('.fighter-1 .spin-badge');await expect(left).toHaveText('↺ 左迴旋');await expect(left).toHaveAttribute('data-spin','L');await expect(right).toContainText('右迴旋');await expect(right).toContainText('推定');await expect(right).toHaveAttribute('data-spin','R');
 await page.keyboard.press('Space');await page.keyboard.press('Enter');await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await expect(left).toBeVisible();await expect(right).toBeVisible();
 for(const badge of [left,right])expect(await badge.evaluate(e=>{const r=e.getBoundingClientRect(),f=e.closest('.fighter')!.getBoundingClientRect();return r.width>0&&r.left>=f.left&&r.right<=f.right&&r.right<=innerWidth;})).toBe(true);
 await page.screenshot({path:`artifacts/spin-battle-${mobile?'mobile':'desktop'}-v0190.png`});
 await action('pause').first().click();await expect(left).toContainText('左迴旋');
});
