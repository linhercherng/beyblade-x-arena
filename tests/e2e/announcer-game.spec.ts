import{test,expect}from'@playwright/test';
import{installAnnouncerProbe}from'./announcer-probe.ts';
for(const mode of ['cpu','local'])test(`${mode}完整對戰依終結與實際贏家播報`,async({page})=>{
 await page.setViewportSize({width:640,height:480});await page.emulateMedia({reducedMotion:'reduce'});await installAnnouncerProbe(page);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');if(mode==='local')await page.locator('[data-action="mode"][data-value="local"]').click();await page.locator('[data-action="quick-battle"]').click();
 for(let round=1;round<=14;round++){
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  const speed=page.locator('[data-action="speed"]');while(await speed.textContent()!=='4×')await speed.click();
  await expect(page.locator('[data-action="next-round"], [data-action="rematch"]')).toBeVisible({timeout:45000});
  const calls=await page.evaluate(()=>(window as any).announced as string[]);expect(calls.filter(x=>['burst','over','extreme','spin','draw'].includes(x))).toHaveLength(round);
  const hero=page.locator('.result-hero');if(await hero.isVisible()){
   const winner=await hero.getAttribute('data-winner'),cue=mode==='local'?(winner==='0'?'player1':'player2'):(winner==='0'?'victory':'defeat');
   await expect.poll(()=>page.evaluate(()=>(window as any).announcementEnds.at(-1))).toBe(cue);expect(await page.evaluate(()=>(window as any).announced.at(-1))).toBe(cue);expect(errors).toEqual([]);return;
  }
  expect(calls.at(-1)).toBe(await page.locator('.round-result').getAttribute('data-finish'));await page.locator('[data-action="next-round"]').click();await page.keyboard.press('Space');if(mode==='local')await page.keyboard.press('Enter');
 }
 throw new Error('超過14場仍未結算');
});
