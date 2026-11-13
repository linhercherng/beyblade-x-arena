import {test,expect} from '@playwright/test';
for(const local of [false,true])test(`${local?'手機雙人':'桌機單人'}可隨機選三顆、重抽、手動編輯並確認出場`,async({page})=>{
 await page.setViewportSize(local?{width:390,height:844}:{width:1280,height:900});
 const action=(a:string)=>page.locator(`[data-action="${a}"]`),lineup=page.locator('.team-panel .lineup');
 await page.addInitScript(()=>{let seed=100;Object.defineProperty(crypto,'getRandomValues',{value:(values:Uint32Array)=>{values.fill(seed++);return values;}});});
 await page.goto('/');if(local)await page.locator('[data-action="mode"][data-value="local"]').click();await action('play').first().click();
 await action('random-team').click();await expect(lineup.locator('.filled')).toHaveCount(3);const first=await lineup.locator('[data-action="select"]').evaluateAll(els=>els.map(e=>(e as HTMLElement).dataset.id));
 await expect(action('confirm-team')).toBeEnabled();await action('random-team').click();const second=await lineup.locator('[data-action="select"]').evaluateAll(els=>els.map(e=>(e as HTMLElement).dataset.id));expect(second).not.toEqual(first);
 await lineup.locator('[data-action="select"]').first().click();await expect(lineup.locator('.filled')).toHaveCount(2);await expect(action('confirm-team')).toBeDisabled();
 await action('random-team').click();await expect(lineup.locator('.filled')).toHaveCount(3);await page.screenshot({path:`artifacts/random-team-${local?'mobile':'desktop'}-v0171.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await action('confirm-team').click();if(local){await expect(page.locator('#app')).toHaveAttribute('data-screen','privacy');await action('handoff').click();await expect(lineup.locator('.filled')).toHaveCount(0);await action('random-team').click();await action('confirm-team').click();}
 await expect(page.locator('.reveal-teams .filled')).toHaveCount(6);await action('begin-match').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','launch');
});
