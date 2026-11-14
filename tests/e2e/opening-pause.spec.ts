import{test,expect}from'@playwright/test';
test.setTimeout(45000);

// 故障注入：RAF空窗後第一個回呼保留舊音訊時鐘，之後恢復原生時鐘。
for(const mode of ['cpu','local'])test(`${mode}開場取樣空窗不誤觸暫停，恢復後完成倒數再進入對戰`,async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any,Original=AudioContext,request=window.requestAnimationFrame.bind(window);
  let held=false,releaseClock=false,prepareNext=false,prepared:()=>void,clock=0,ctx:AudioContext,pending:FrameRequestCallback[]=[];
  w.freezeClock=false;
  w.AudioContext=class extends Original{constructor(){super();ctx=this;}get currentTime(){return w.freezeClock?clock:super.currentTime;}};
  const frame=(cb:FrameRequestCallback)=>request(time=>{
   if(held){pending.push(cb);return;}
   const starting=prepareNext&&document.querySelector<HTMLElement>('#app')?.dataset.screen==='countdown';if(starting){prepareNext=false;clock=ctx.currentTime;w.freezeClock=true;}
   try{cb(time);}finally{if(starting){held=true;prepared();}else if(releaseClock){w.freezeClock=false;releaseClock=false;}}
  });
  window.requestAnimationFrame=frame;
  w.holdOpening=(value:boolean)=>{held=value;if(!value){releaseClock=true;for(const cb of pending.splice(0))frame(cb);}};
  w.armOpeningGap=()=>{prepareNext=true;w.openingPrepared=new Promise<void>(resolve=>prepared=resolve);};
 });
 await page.goto('/');if(mode==='local')await page.locator('[data-action="mode"][data-value="local"]').click();
 await page.evaluate(()=>(window as any).armOpeningGap());await page.locator('[data-action="quick-battle"]').click();
 await page.evaluate(()=>(window as any).openingPrepared);await page.waitForTimeout(1600);
 await page.evaluate(()=>(window as any).holdOpening(false));await page.waitForTimeout(50);
 const paused=await page.locator('#pause-overlay').isVisible();
 if(paused){
  await page.locator('.music-controls').evaluate((n:HTMLDetailsElement)=>n.open=true);await page.getByRole('button',{name:'裝置檢查',exact:true}).click();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出檢查紀錄',exact:true}).click();await(await download).saveAs(`artifacts/repro-opening-pause-${mode}.json`);
 }
 expect(paused).toBe(false);
 await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:20000});
 await expect(page.locator('#pause-overlay')).toBeHidden();
});
