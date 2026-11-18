import {test,expect} from '@playwright/test';
import{holdFrameAt}from'./frame-hold.ts';

for(const local of [false,true])test(`${local?'手機雙人':'桌機單人'}一鍵隨機雙方隊伍並倒數開戰，沿用正常計分與下一場`,async({page})=>{
 const action=(a:string)=>page.locator(`[data-action="${a}"]`),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize(local?{width:390,height:844}:{width:1280,height:900});
 await page.addInitScript(()=>{let seed=13140;Object.defineProperty(crypto,'getRandomValues',{value:(v:Uint32Array)=>{v.fill(seed++);return v;}});});
 await holdFrameAt(page,'#app[data-screen="countdown"]');try{
 await page.goto('/');if(local)await page.locator('[data-action="mode"][data-value="local"]').click();else await page.locator('[data-action="difficulty"][data-value="hard"]').click();
 await expect(action('quick-battle')).toBeVisible();await action('quick-battle').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/quick-battle-home-${local?'mobile':'desktop'}-v0180.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await action('quick-battle').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');await expect(action('lock')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).stageFrameHold.state().held)).toBeGreaterThan(0);
 const teams=await page.locator('.remaining-lineup').allTextContents();expect(teams).toHaveLength(2);for(const text of teams){expect(text).toContain('1.');expect(text).toContain('2.');expect(text).toContain('3.');}expect(teams[0]).not.toEqual(teams[1]);
 await expect(page.locator('.fighter-1 .fighter-header')).toContainText(local?'2P':'CPU');await expect(page.locator('#battle-time')).toHaveText('0.0 秒');
 await action('pause').first().click();await expect(page.locator('#pause-overlay')).toBeVisible();await page.evaluate(()=>(window as any).stageFrameHold.release());await expect.poll(()=>page.evaluate(()=>(window as any).stageFrameHold.state().resumed)).toBeGreaterThanOrEqual(2);expect(await page.evaluate(()=>(window as any).stageFrameHold.state().held)).toBe(0);await page.waitForTimeout(200);await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');await page.locator('#pause-overlay [data-action="pause"]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});await expect(action('shout')).toHaveCount(local?2:1);
 await page.screenshot({path:`artifacts/quick-battle-live-${local?'mobile':'desktop'}-v0180.png`});
 while(await action('speed').textContent()!=='4×')await action('speed').click();
 await expect(page.locator('#highlight-panel,[data-action="next-round"],[data-action="rematch"]').first()).toBeVisible({timeout:45000});if(await action('skip-highlight').isVisible())await action('skip-highlight').click();
 await expect(page.locator('.round-result,.result-hero').first()).toBeVisible();
 if(await action('next-round').isVisible()){
  await expect(page.locator('.round-result .eyebrow')).toHaveText('ROUND 1 COMPLETE');await action('next-round').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','launch');await expect(action('lock')).toHaveCount(local?2:1);
 }
 expect(errors).toEqual([]);
 }finally{await page.evaluate(()=>(window as any).stageFrameHold?.release()).catch(()=>{});}
});
