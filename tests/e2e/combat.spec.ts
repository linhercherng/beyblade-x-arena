import {test,expect} from '@playwright/test';
const fixture='/tests/fixtures/combat.html'+(process.env.CI?'?software-gpu':'');
import examples from '../fixtures/v5-combat.json' with {type:'json'};
test('真實對決自然觸發四種終結並接續各自3D演出',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:760});await page.goto(fixture);
  for(const kind of ['burst','over','extreme','spin'] as const){
    await page.locator('#'+kind).click();
    await expect(page.locator('#result')).toContainText(kind,{timeout:30000});
    await page.waitForTimeout(1000);
    const m=await page.evaluate(()=>(window as any).combatMetrics());
    expect(m.result.finish).toBe(kind);expect(m.version).toBe(5);
    expect(m.result.time).toBeCloseTo(examples[kind].time,9);expect(m.result.winner).toBe(examples[kind].winner);
    if(kind==='burst')expect(m.finishRate).toBeLessThan(1);
    const loser=1-m.result.winner;
    if(kind==='burst')expect(new Set(m.parts[loser].map((p:number[])=>p.join(','))).size).toBe(3);
    if(kind==='over')expect(Math.abs(m.positions[loser][0])).toBeGreaterThan(5.4);
    if(kind==='extreme')expect(m.positions[loser][2]).toBeGreaterThan(5.4);
    await page.screenshot({path:`artifacts/natural-${kind}-v0100.png`});
  }
  expect(errors).toEqual([]);
});
