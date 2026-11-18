import{test,expect}from'@playwright/test';
test('隔離頁明確標記軟體GPU解析度與陰影，CSS與鏡頭比例不變',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/tests/fixtures/bey-effects.html?software-gpu');const profile=await page.evaluate(()=>(window as any).effectMetrics().renderProfile);
 expect(profile).toBeDefined();expect(profile.softwareGpu).toBe(true);expect(profile.pixelRatio).toBe(.25);expect(profile.width).toBe(97);expect(profile.height).toBe(211);expect(profile.shadows).toBe(false);expect(profile.cssWidth).toBe(390);expect(profile.cssHeight).toBe(844);expect(profile.aspect).toBeCloseTo(390/844,10);expect(profile.renderer).not.toBe('');
});
test('批次略過GPU提交仍復原render並保留原始錯誤及最後一次實際繪圖',async({page})=>{
 await page.goto('/tests/fixtures/bey-effects.html?software-gpu');const result=await page.evaluate(async()=>{
  const{batchDraw}=await import('/tests/fixtures/render-profile.ts'),arena=(window as any).identityArena,original=arena.renderer.render;let calls=0,error='';
  const wrapper=(...args:any[])=>{calls++;return original.apply(arena.renderer,args);};arena.renderer.render=wrapper;
  try{batchDraw(arena,()=>{arena.renderer.render(arena.scene,arena.camera);arena.renderer.render(arena.scene,arena.camera);throw Error('batch-probe');});}catch(e){error=(e as Error).message;}
  const restored=arena.renderer.render===wrapper;arena.renderer.render=original;return{calls,error,restored};
 });expect(result).toEqual({calls:1,error:'batch-probe',restored:true});
});
