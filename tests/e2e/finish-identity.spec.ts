import{test,expect}from'@playwright/test';
for(const pair of ['special','left','bound'])test(`${pair}三種終結延續本色與特殊零件光環，暫停穩定`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:640,height:480});await page.goto('/tests/fixtures/finish.html');const metrics=()=>page.evaluate(()=>(window as any).finishIdentityMetrics());
 await page.locator('#'+pair).click();for(const kind of ['burst','over','extreme']){await page.locator('#capture').click();await page.locator('#'+kind).click();const m=await metrics();expect(m.auras.every((a:any)=>a.visible)).toBe(true);expect(m.scales.every((s:number)=>s<.8&&s>.7)).toBe(true);expect(m.cutoff).toBe(m.effects[1].dash.cutoff);expect(m.auras[0].color).not.toBe(m.auras[1].color);if(kind!=='burst')expect(new Set(m.trailColors.map((v:number)=>Math.round(v*1000))).size).toBeGreaterThan(3);await page.screenshot({path:`artifacts/finish-identity-${pair}-${kind}-v0280.png`});const frozen=(await metrics()).auras;await page.waitForTimeout(50);expect((await metrics()).auras).toEqual(frozen);}
 expect(errors).toEqual([]);
});
