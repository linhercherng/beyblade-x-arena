import {test,expect,type Page} from '@playwright/test';
test.setTimeout(45000);
test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:1080}});
type Point={id:number;selector:string;x:number;y:number};
async function setup(page:Page){
  await page.goto('/');await page.locator('[data-action="mode"][data-value="local"]').click();
  for(const action of ['play','quick','confirm-team','handoff','quick','confirm-team','begin-match'])await page.locator(`[data-action="${action}"]`).first().click();
}
async function point(page:Page,selector:string,id:number,f=.5):Promise<Point>{
  const b=await page.locator(selector).boundingBox();if(!b)throw Error(selector);
  return {id,selector,x:b.x+b.width*f,y:b.y+b.height/2};
}
// WebKit公開自動化API僅提供單點tap；這裡明確驗證合成TouchEvent容錯，不冒稱硬體多指。
async function touches(page:Page,type:string,points:Point[]){
  await page.evaluate(({type,points})=>{
    const host=window as unknown as {testTouches?:Map<number,{identifier:number;target:Element;clientX:number;clientY:number}>};
    const active=host.testTouches??=new Map();
    const ts=points.map(p=>{
      const t={identifier:p.id,target:active.get(p.id)?.target??document.querySelector(p.selector)!,clientX:p.x,clientY:p.y};
      active.set(p.id,t);return t;
    });
    if(type==='touchend'||type==='touchcancel')for(const t of ts)active.delete(t.identifier);
    const event=document.createEvent('TouchEvent');event.initEvent(type,true,true);
    Object.defineProperties(event,{changedTouches:{value:ts},touches:{value:[...active.values()]},targetTouches:{value:[...active.values()].filter(t=>t.target===ts[0].target)}});
    ts[0].target.dispatchEvent(event);
  },{type,points});
}
test('TouchEvent路徑雙方可同時拖曳、按下鎖定與呼喊',async({page})=>{
  await setup(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const angles=await Promise.all([point(page,'[data-angle="0"]',11,.15),point(page,'[data-angle="1"]',22,.85)]);
  await touches(page,'touchstart',angles);
  expect(Number(await page.getByLabel('1P 發射傾角').inputValue())).toBeLessThan(8);
  expect(Number(await page.getByLabel('2P 發射傾角').inputValue())).toBeGreaterThan(22);
  await touches(page,'touchend',angles);
  const locks=await Promise.all([0,1].map(p=>point(page,`[data-action="lock"][data-player="${p}"]`,p+30)));
  await touches(page,'touchstart',locks);await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  const shouts=await Promise.all([0,1].map(p=>point(page,`#shout-${p}`,p+40)));
  await touches(page,'touchstart',shouts);for(const p of [0,1])await expect(page.locator(`#shout-${p}`)).toBeDisabled();
  expect(errors).toEqual([]);
});

test('TouchEvent取消只清理該手指，旋轉與背景恢復需重新觸控',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
  const a=await point(page,'[data-angle="0"]',1,.2),b=await point(page,'[data-angle="1"]',2,.8);
  await touches(page,'touchstart',[a,b]);await touches(page,'touchcancel',[a]);
  await touches(page,'touchmove',[{...b,x:b.x-20}]);
  expect(Number(await page.getByLabel('2P 發射傾角').inputValue())).toBeLessThan(24);
  await touches(page,'touchend',[b]);
  // Safari工具列只改高度時，手勢繼續。
  const fresh=await point(page,'[data-angle="0"]',3,.2);await touches(page,'touchstart',[fresh]);
  await page.setViewportSize({width:390,height:1000});
  await touches(page,'touchmove',[await point(page,'[data-angle="0"]',3,.8)]);
  await expect(page.getByLabel('1P 發射傾角')).toHaveValue('24');
  for(const size of [{width:844,height:390},{width:390,height:1080}]){
    await page.setViewportSize(size);
    const frozen=await page.getByLabel('1P 發射傾角').inputValue();
    await touches(page,'touchmove',[await point(page,'[data-angle="0"]',3,.1)]);
    await expect(page.getByLabel('1P 發射傾角')).toHaveValue(frozen);
    await touches(page,'touchend',[fresh]);
    await touches(page,'touchstart',[await point(page,'[data-angle="0"]',3,.7)]);
    await expect(page.getByLabel('1P 發射傾角')).toHaveValue('21');
  }
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('#pause-overlay')).toBeVisible();
  const frozen=await page.getByLabel('1P 發射傾角').inputValue();
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await page.keyboard.press('Escape');await expect(page.locator('#pause-overlay')).toBeHidden();
  await touches(page,'touchmove',[await point(page,'[data-angle="0"]',3,.1)]);
  await expect(page.getByLabel('1P 發射傾角')).toHaveValue(frozen);
  await touches(page,'touchend',[fresh]);
  await touches(page,'touchstart',[await point(page,'[data-angle="0"]',4,.1)]);
  await expect(page.getByLabel('1P 發射傾角')).toHaveValue('3');
  expect(errors).toEqual([]);
});

test('WebKit原生單點tap與鍵盤可各自鎖定，無重複動作',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
  const initial=Number(await page.getByLabel('2P 發射傾角').inputValue());
  await page.getByLabel('2P 傾角增加1度').tap();await expect(page.getByLabel('2P 發射傾角')).toHaveValue(String(initial+1));
  await page.getByLabel('1P 傾角減少1度').tap();await expect(page.getByLabel('1P 發射傾角')).toHaveValue('9');
  const lock=await point(page,'[data-action="lock"][data-player="1"]',1);
  await page.touchscreen.tap(lock.x,lock.y);
  await expect(page.locator('[data-action="lock"][data-player="1"]')).toBeDisabled();
  await expect(page.locator('[data-action="lock"][data-player="0"]')).toBeEnabled();
  await page.locator('[data-action="lock"][data-player="0"]').focus();await page.keyboard.press('Space');
  await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');
  expect(errors).toEqual([]);
});
