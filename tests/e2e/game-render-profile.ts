import type{Page}from'@playwright/test';
export async function profileGameClock(page:Page){
 if(!process.env.CI)return;
 await page.route(url=>url.pathname==='/src/arena.ts',async route=>{
  const response=await route.fetch(),source=await response.text();
  await route.fulfill({response,body:source+`\nimport{fixtureProfile as __clockProfile}from'/tests/fixtures/render-profile.ts';
  {const attach=Arena.prototype.attach,seen=new WeakSet();Arena.prototype.attach=function(...args){if(!seen.has(this)){seen.add(this);const profile=__clockProfile(this);(window.gameRenderProfiles??=[]).push(profile.info);}return attach.apply(this,args);};}\n`});
 });
}
