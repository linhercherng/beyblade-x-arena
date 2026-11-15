import{test,expect}from'@playwright/test';const metrics=(p:import('@playwright/test').Page)=>p.evaluate(()=>(window as any).frictionMetrics());
test.use({viewport:{width:640,height:480}});
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)console.log('Friction failure',await page.evaluate(()=>({metrics:(window as any).frictionMetrics?.(),audio:(window as any).frictionSound?.diagnostics()})));});
test('摩擦細節壓低配樂且保留音量偏好，結束後平滑回復原音量',async({page})=>{
 await page.goto('/tests/fixtures/friction.html');await page.locator('#slow').click();await expect.poll(async()=>(await metrics(page)).mix).toBeLessThan(.6);await page.evaluate(()=>(window as any).frictionSound.setMusicVolume(.3));await expect.poll(async()=>(await metrics(page)).musicGain).toBeLessThan(.3*.34*.8);expect((await metrics(page)).volume).toBe(.3);
 await page.locator('#fast').click();await expect.poll(async()=>(await metrics(page)).mix).toBe(1);await expect.poll(async()=>(await metrics(page)).musicGain).toBeCloseTo(.3*.34,3);expect((await metrics(page)).volume).toBe(.3);expect((await metrics(page)).peak).toBeLessThan(.95);
});
test('精彩重播定格收起摩擦聲，慢放恢復降調且跳過不殘留',async({page})=>{
 await page.goto('/tests/fixtures/friction.html');await page.locator('#slow').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);
 await page.evaluate(()=>{const s=(window as any).frictionSound;s.beginReplay();s.setReplay('impact');});await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);
 await page.evaluate(()=>(window as any).frictionSound.setReplay('tracking'));await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);await expect.poll(async()=>Math.max(...(await metrics(page)).voices.map((v:any)=>v.rate))).toBeLessThan(.65);await page.locator('#skip').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);
});
test('低速摩擦重用聲源，側倒與回擺同步改變音量，停止後清理且無爆音',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:640,height:480});await page.goto('/tests/fixtures/friction.html');await page.locator('#slow').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);await page.waitForTimeout(150);const before=await metrics(page);expect(before.voices.every((v:any)=>v.gain>0&&v.gain<=.25)).toBe(true);await page.waitForTimeout(200);expect((await metrics(page)).voices.map((v:any)=>v.id)).toEqual(before.voices.map((v:any)=>v.id));
 await page.locator('#stop').click();await expect.poll(async()=>(await metrics(page)).frames[1].phase).toBe('settle');const settling=await metrics(page);expect(settling.voices.find((v:any)=>v.player===1)?.id).toBe(before.voices[1].id);await page.locator('#end').click();await expect.poll(async()=>(await metrics(page)).frames[1].phase).toBe('off');await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);const end=await metrics(page);expect(end.finishAge).toBeGreaterThanOrEqual(1.6);expect(end.peak).toBeLessThan(.95);expect(end.stable).toBe(true);expect(errors).toEqual([]);
});
test('快速暫停、恢復及靜音不疊加摩擦聲，尾端跳轉不補播',async({page})=>{
 await page.goto('/tests/fixtures/friction.html');await page.locator('#slow').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);await page.locator('#pause').click();const t=(await metrics(page)).time;await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);expect((await metrics(page)).time).toBe(t);await page.locator('#resume').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);
 await page.evaluate(()=>{const s=(window as any).frictionSound;for(let i=0;i<20;i++)s.toggle();});expect((await metrics(page)).voices.length).toBeLessThanOrEqual(2);await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);await page.locator('#mute').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);await page.locator('#stop').click();await page.locator('#seek').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);await page.locator('#resume').click();await page.waitForTimeout(150);expect((await metrics(page)).voices).toHaveLength(0);expect((await metrics(page)).peak).toBeLessThan(.95);
});
test('背景與輸出裝置中斷清除舊摩擦聲，手勢恢復只建立雙方各一份',async({page})=>{
 await page.goto('/tests/fixtures/friction.html');await page.locator('#slow').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);await page.locator('#background').click();expect((await metrics(page)).voices).toHaveLength(0);await page.locator('#foreground').click();await page.waitForTimeout(80);expect((await metrics(page)).voices).toHaveLength(0);await page.locator('#resume').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);
 await page.evaluate(()=>{for(let i=0;i<4;i++)navigator.mediaDevices.dispatchEvent(new Event('devicechange'));});expect((await metrics(page)).voices).toHaveLength(0);await page.locator('#resume').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);expect((await metrics(page)).peak).toBeLessThan(.95);
});


test('正式遊戲離開盤面後清除低幀率殘留的摩擦狀態',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(crypto,'getRandomValues',{value:(a:Uint32Array)=>{a.fill(7181);return a;}}));await page.goto('/');
 await page.evaluate(async()=>{
  const {Arena}=await import('/src/arena.ts'),{Sound}=await import('/src/audio.ts'),w=window as any,draw=Arena.prototype.draw,update=Sound.prototype.update;w.frictionGame={forced:0};
  Arena.prototype.draw=function(...args:any[]){const result=draw.apply(this,args);if(args[1]?.result){w.frictionGame.forced++;this.friction[1]={phase:'settle',level:.2,rate:.6,cutoff:1500,pan:0};}return result;};
  Sound.prototype.update=function(...args:any[]){const result=update.apply(this,args);Object.assign(w.frictionGame,{screen:document.querySelector('#app')?.getAttribute('data-screen'),frames:args[4]??null,voices:this.frictionVoices.size,mix:this.frictionMix,ready:this.countdownReady});return result;};
 });
 await page.keyboard.press('Space');await expect.poll(()=>page.evaluate(()=>(window as any).frictionGame.ready)).toBe(true);await page.locator('[data-action="quick-battle"]').click();await expect(page.locator('#app')).toHaveAttribute('data-screen','battle',{timeout:12000});while(await page.locator('[data-action="speed"]').textContent()!=='4×')await page.locator('[data-action="speed"]').click();
 await expect(page.locator('#highlight-panel,[data-action="next-round"],[data-action="rematch"]').first()).toBeVisible({timeout:45000});if(await page.locator('#highlight-panel').isVisible())await page.locator('[data-action="skip-highlight"]').click();
 await expect(page.locator('[data-action="next-round"],[data-action="rematch"]')).toBeVisible();expect(await page.evaluate(()=>(window as any).frictionGame.forced)).toBeGreaterThan(0);await expect.poll(()=>page.evaluate(()=>(window as any).frictionGame.frames)).toBeNull();await expect.poll(()=>page.evaluate(()=>(window as any).frictionGame.voices)).toBe(0);await expect.poll(()=>page.evaluate(()=>(window as any).frictionGame.mix)).toBe(1);
});


for(const material of ['metal','plastic','rubber'])test(`${material}軸心使用專屬快取音色，擦盤側躺與慢放同步且不疊音`,async({page})=>{
 await page.goto('/tests/fixtures/friction.html');await page.locator('#'+material).click();await expect.poll(async()=>(await metrics(page)).voices.filter((v:any)=>v.material===material&&!v.closing).length).toBe(2);const spin=await metrics(page);expect(spin.cache).toBe(3);expect(spin.frames.every((f:any)=>f.material===material)).toBe(true);expect(spin.voices.every((v:any)=>v.cached)).toBe(true);
 await page.evaluate(()=>(window as any).frictionSound.beginReplay());await expect.poll(async()=>(await metrics(page)).voices.filter((v:any)=>!v.closing).length).toBe(2);await expect.poll(async()=>(await metrics(page)).voices.find((v:any)=>!v.closing)?.rate??0).toBeCloseTo(.746*.55,3);
 await expect.poll(async()=>{const m=await metrics(page);return Math.abs((m.voices.find((v:any)=>!v.closing)?.cutoff??0)-m.frames[0].cutoff*.55)/m.frames[0].cutoff;}).toBeLessThan(.05);
 const delta=await page.evaluate(()=>{const w=window as any,before=w.frictionMetrics().time;w.frictionStep(.4);return w.frictionMetrics().time-before;});expect(delta).toBeCloseTo(.4*.55,8);
 await page.evaluate(()=>(window as any).frictionSound.setReplay('impact'));await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);const held=await page.evaluate(()=>{const w=window as any,before=w.frictionMetrics().time;w.frictionStep(.4);return w.frictionMetrics().time-before;});expect(held).toBe(0);
 await page.evaluate(()=>(window as any).frictionSound.setReplay('tracking'));await expect.poll(async()=>(await metrics(page)).voices.filter((v:any)=>v.material===material&&!v.closing).length).toBe(2);const resumed=await metrics(page);await page.locator('#stop').click();await expect.poll(async()=>(await metrics(page)).frames[1].phase).toBe('settle');expect((await metrics(page)).voices.find((v:any)=>v.player===1)?.id).toBe(resumed.voices[1].id);
 await page.evaluate(()=>(window as any).frictionStep(4));await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);expect((await metrics(page)).frames[1].phase).toBe('off');expect((await metrics(page)).peak).toBeLessThan(.95);expect((await metrics(page)).stable).toBe(true);
});

test('連續切換軸心材質等待舊聲源淡出，不重建快取或疊加同一玩家聲音',async({page})=>{
 await page.goto('/tests/fixtures/friction.html');await page.locator('#metal').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);
 for(const material of ['rubber','plastic','metal','rubber']){await page.locator('#'+material).click();await expect.poll(async()=>(await metrics(page)).voices.filter((v:any)=>v.material===material&&!v.closing).length).toBe(2);expect((await metrics(page)).voices.length).toBeLessThanOrEqual(2);expect((await metrics(page)).cache).toBe(3);}
 await page.locator('#skip').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);expect((await metrics(page)).peak).toBeLessThan(.95);
});


test('三材質連續碰撞與齒軌交接保留摩擦聲源，強瞬態退讓後平滑恢復',async({page})=>{
 await page.goto('/tests/fixtures/friction.html');
 const tones:number[][]=[];
 for(const material of ['metal','plastic','rubber']){
  await page.locator('#'+material).click();await expect.poll(async()=>(await metrics(page)).voices.filter((v:any)=>v.material===material&&!v.closing).length).toBe(2);const before=await metrics(page);
  const burst=await page.evaluate(()=>{const w=window as any,hit=w.frictionEvent('dash-hit'),rail=w.frictionEvent('rail',1);for(let i=0;i<30;i++){w.frictionEvent('hit');w.frictionEvent('dash',i%2);}return{hit,rail,last:w.frictionMetrics()};});
  expect(burst.hit.duckFloor).toBeLessThan(.4);expect(burst.hit.duckFloor).toBeGreaterThan(0);expect(burst.rail.duckFloor).toBeLessThanOrEqual(burst.hit.duckFloor);expect(burst.rail.duckUntil).toBeGreaterThanOrEqual(burst.hit.duckUntil);expect(burst.last.duckUntil).toBeGreaterThan(burst.last.clock);
  expect(burst.last.voices.map((v:any)=>v.id)).toEqual(before.voices.map((v:any)=>v.id));expect(burst.last.impacts.length).toBeLessThanOrEqual(6);expect(burst.last.dashes.length).toBeLessThanOrEqual(2);
  tones.push([burst.hit.impacts.at(-1).cutoff,burst.rail.dashes.at(-1).cutoff]);console.log('Handoff material',material,burst.hit.bits,tones.at(-1));
  await expect.poll(async()=>(await metrics(page)).clock).toBeGreaterThan(burst.last.duckUntil+.6);await expect.poll(async()=>(await metrics(page)).duck).toBeGreaterThan(.98);const done=await metrics(page);expect(done.voices.map((v:any)=>v.id)).toEqual(before.voices.map((v:any)=>v.id));expect(done.peak).toBeLessThan(.95);expect(done.stable).toBe(true);
 }
 for(const layer of [0,1]){expect(tones[0][layer]).toBeGreaterThan(tones[1][layer]);expect(tones[1][layer]).toBeGreaterThan(tones[2][layer]);}
});

test('重播碰撞與咬軌速率及材質頻寬同為0.55倍，暫停清除交接排程',async({page})=>{
 await page.goto('/tests/fixtures/friction.html');await page.locator('#metal').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);
 const normal=await page.evaluate(()=>{const w=window as any;w.frictionEvent('hit');return w.frictionEvent('rail');});
 await page.evaluate(()=>(window as any).frictionSound.beginReplay());await expect.poll(async()=>(await metrics(page)).voices.filter((v:any)=>!v.closing).length).toBe(2);await page.waitForTimeout(200);
 const slow=await page.evaluate(()=>{const w=window as any;w.frictionEvent('hit');return w.frictionEvent('rail');});expect(slow.impacts.at(-1).rate).toBeCloseTo(normal.impacts.at(-1).rate*.55,6);expect(slow.dashes.at(-1).rate).toBeCloseTo(normal.dashes.at(-1).rate*.55,6);expect(slow.impacts.at(-1).cutoff).toBeCloseTo(normal.impacts.at(-1).cutoff*.55,5);expect(slow.dashes.at(-1).cutoff).toBeCloseTo(normal.dashes.at(-1).cutoff*.55,5);
 await page.locator('#pause').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(0);expect((await metrics(page)).duckFloor).toBe(1);expect((await metrics(page)).duckUntil).toBe(-Infinity);await page.locator('#resume').click();await expect.poll(async()=>(await metrics(page)).voices.length).toBe(2);await expect.poll(async()=>(await metrics(page)).duck).toBeCloseTo(1,3);expect((await metrics(page)).peak).toBeLessThan(.95);
});
