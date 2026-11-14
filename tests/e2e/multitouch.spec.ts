import {test,expect,type Page,type CDPSession} from '@playwright/test';
test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:1080}});
const action=(page:Page,a:string)=>page.locator(`[data-action="${a}"]`);
async function setup(page:Page){
  await page.goto('/');await page.locator('[data-action="mode"][data-value="local"]').click();
  await action(page,'play').first().click();await action(page,'quick').click();await action(page,'confirm-team').click();
  await action(page,'handoff').click();await action(page,'quick').click();await action(page,'confirm-team').click();await action(page,'begin-match').click();
  return page.context().newCDPSession(page);
}
async function point(page:Page,selector:string,id:number,fraction=.5){
  const b=await page.locator(selector).boundingBox();if(!b)throw Error(selector);
  return {id,x:b.x+b.width*fraction,y:b.y+b.height/2,radiusX:5,radiusY:5,force:1};
}
const touch=(cdp:CDPSession,type:string,touchPoints:object[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
test('兩根真實觸點同時鎖定，未放手前已各自生效；不重複鎖定或呼喊',async({page})=>{
  const cdp=await setup(page),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const locks=await Promise.all([0,1].map(p=>point(page,`[data-action="lock"][data-player="${p}"]`,p+1)));
  await touch(cdp,'touchStart',locks);
  await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');
  await touch(cdp,'touchEnd',[]);
  await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});
  const shouts=await Promise.all([0,1].map(p=>point(page,`#shout-${p}`,p+3)));
  await touch(cdp,'touchStart',shouts);
  await expect(page.locator('#shout-0')).toBeDisabled();await expect(page.locator('#shout-1')).toBeDisabled();
  await touch(cdp,'touchEnd',[]);await expect(page.locator('#app')).toHaveAttribute('data-screen','battle');
  expect(errors).toEqual([]);await cdp.detach();
});
test('雙人同時拖角度；一方鎖定不打斷另一方持續拖曳',async({page})=>{
  const cdp=await setup(page);
  const a=await point(page,'[data-angle="0"]',1,.15),b=await point(page,'[data-angle="1"]',2,.85);
  await touch(cdp,'touchStart',[a,b]);
  expect(Number(await page.getByLabel('1P 發射傾角').inputValue())).toBeLessThan(8);
  expect(Number(await page.getByLabel('2P 發射傾角').inputValue())).toBeGreaterThan(22);
  await touch(cdp,'touchMove',[{...a,x:a.x+20},{...b,x:b.x-20}]);
  const values=await page.locator('[data-angle]').evaluateAll(ns=>ns.map(n=>Number((n as HTMLInputElement).value)));
  expect(values[0]).toBeLessThan(values[1]);
  await touch(cdp,'touchEnd',[b]);
  const lock=await point(page,'[data-action="lock"][data-player="0"]',3);
  await touch(cdp,'touchStart',[b,lock]);
  await expect(page.getByLabel('1P 發射傾角')).toBeDisabled();await expect(page.getByLabel('2P 發射傾角')).toBeEnabled();
  await touch(cdp,'touchEnd',[b]);await touch(cdp,'touchMove',[{...b,x:b.x-45}]);
  expect(Number(await page.getByLabel('2P 發射傾角').inputValue())).toBeLessThan(values[1]);
  await touch(cdp,'touchEnd',[]);await cdp.detach();
});
test('兩根觸點同時點選方向與落點，不開啟系統選單或串到另一方',async({page})=>{
  const cdp=await setup(page);
  const a=await point(page,'[data-action="direction"][data-player="0"][data-value="-1"]',1);
  const b=await point(page,'[data-action="direction"][data-player="1"][data-value="1"]',2);
  await touch(cdp,'touchStart',[a,b]);
  await expect(page.getByRole('group',{name:'1P 傾斜方向'}).getByRole('button',{name:'內切',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('group',{name:'2P 傾斜方向'}).getByRole('button',{name:'外切',exact:true})).toHaveAttribute('aria-pressed','true');
  await touch(cdp,'touchEnd',[]);
  const lanes=await Promise.all([0,1].map(p=>point(page,`[data-action="lane"][data-player="${p}"][data-value="${p?2:0}"]`,p+3)));
  await touch(cdp,'touchStart',lanes);
  for(const p of [0,1])await expect(page.locator(`[data-action="lane"][data-player="${p}"][data-value="${p?2:0}"]`)).toHaveClass(/selected/);
  await touch(cdp,'touchEnd',[]);await page.screenshot({path:'artifacts/multitouch-directions-v0202.png',fullPage:true});await cdp.detach();
});
test('取消與暫停清理手勢；拖過中線仍只改原玩家，恢復後需重新碰觸',async({page})=>{
  const cdp=await setup(page),a=await point(page,'[data-angle="0"]',1,.2),b=await point(page,'[data-angle="1"]',2,.8);
  await touch(cdp,'touchStart',[a,b]);await touch(cdp,'touchMove',[a,{...b,x:10}]);
  await expect(page.getByLabel('2P 發射傾角')).toHaveValue('0');const left=await page.getByLabel('1P 發射傾角').inputValue();
  await touch(cdp,'touchCancel',[]);
  const fresh=await point(page,'[data-angle="0"]',3,.7);await touch(cdp,'touchStart',[fresh]);
  expect(Number(await page.getByLabel('1P 發射傾角').inputValue())).toBeGreaterThan(Number(left));
  await page.keyboard.press('Escape');await expect(page.locator('#pause-overlay')).toBeVisible();const frozen=await page.getByLabel('1P 發射傾角').inputValue();
  await touch(cdp,'touchMove',[{...fresh,x:fresh.x-50}]);await expect(page.getByLabel('1P 發射傾角')).toHaveValue(frozen);
  await page.keyboard.press('Escape');await expect(page.locator('#pause-overlay')).toBeHidden();
  await touch(cdp,'touchMove',[{...fresh,x:fresh.x-70}]);await expect(page.getByLabel('1P 發射傾角')).toHaveValue(frozen);
  await touch(cdp,'touchEnd',[]);
  const again=await point(page,'[data-angle="0"]',4,.1);await touch(cdp,'touchStart',[again]);
  expect(Number(await page.getByLabel('1P 發射傾角').inputValue())).toBeLessThan(Number(frozen));
  await touch(cdp,'touchEnd',[]);await cdp.detach();
});
test('聚焦2P按鈕以Space或Enter操作，只啟動該按鈕並保留1P獨立鎖定',async({page})=>{
  const cdp=await setup(page),choice=page.getByRole('group',{name:'2P 傾斜方向'}).getByRole('button',{name:'外切',exact:true});
  await choice.focus();await page.keyboard.press('Space');await expect(choice).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-action="lock"][data-player="0"]')).toBeEnabled();
  const second=page.locator('[data-action="lock"][data-player="1"]');await second.focus();await page.keyboard.press('Enter');
  await expect(second).toBeDisabled();await expect(page.locator('[data-action="lock"][data-player="0"]')).toBeEnabled();
  await page.locator('[data-action="lock"][data-player="0"]').focus();await page.keyboard.press('Space');
  await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');await cdp.detach();
});
test('雙方保持滑桿拖曳時另指點方向；同玩家多指碰滑桿不搶走原手勢',async({page})=>{
  const cdp=await setup(page);
  const sliders=await Promise.all([point(page,'[data-angle="0"]',1,.2),point(page,'[data-angle="1"]',2,.8)]);
  await touch(cdp,'touchStart',sliders);
  const directions=await Promise.all([0,1].map(p=>point(page,`[data-action="direction"][data-player="${p}"][data-value="${p?1:-1}"]`,p+3)));
  await touch(cdp,'touchStart',[...sliders,...directions]);
  for(const p of [0,1])await expect(page.locator(`[data-action="direction"][data-player="${p}"][data-value="${p?1:-1}"]`)).toHaveAttribute('aria-pressed','true');
  await touch(cdp,'touchEnd',sliders);
  const first=await page.getByLabel('1P 發射傾角').inputValue(),extra=await point(page,'[data-angle="0"]',5,.9);
  await touch(cdp,'touchStart',[...sliders,extra]);await expect(page.getByLabel('1P 發射傾角')).toHaveValue(first);
  await touch(cdp,'touchEnd',sliders);
  await touch(cdp,'touchMove',[{...sliders[0],x:sliders[0].x+20},{...sliders[1],x:sliders[1].x-20}]);
  expect(Number(await page.getByLabel('1P 發射傾角').inputValue())).toBeGreaterThan(Number(first));
  expect(Number(await page.getByLabel('2P 發射傾角').inputValue())).toBeLessThan(23);
  await touch(cdp,'touchEnd',[]);await cdp.detach();
});

test('旋轉時清理雙指，橫直向切換後雙方可重新拖曳與鎖定',async({page})=>{
  const cdp=await setup(page);
  for(const size of [{width:844,height:390},{width:390,height:1080}]){
    const held=await Promise.all([point(page,'[data-angle="0"]',1,.2),point(page,'[data-angle="1"]',2,.8)]);
    await touch(cdp,'touchStart',held);await page.setViewportSize(size);
    const frozen=await page.locator('[data-angle]').evaluateAll(ns=>ns.map(n=>(n as HTMLInputElement).value));
    const moved=await Promise.all([point(page,'[data-angle="0"]',1,.8),point(page,'[data-angle="1"]',2,.2)]);
    await touch(cdp,'touchMove',moved);
    for(const p of [0,1])await expect(page.locator(`[data-angle="${p}"]`)).toHaveValue(frozen[p]);
    await touch(cdp,'touchEnd',[]);await touch(cdp,'touchStart',moved);
    await expect(page.getByLabel('1P 發射傾角')).toHaveValue('24');await expect(page.getByLabel('2P 發射傾角')).toHaveValue('6');
    await touch(cdp,'touchEnd',[]);
  }
  const locks=await Promise.all([0,1].map(p=>point(page,`[data-action="lock"][data-player="${p}"]`,p+3)));
  await touch(cdp,'touchStart',locks);await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');
  await touch(cdp,'touchEnd',[]);await cdp.detach();
});
