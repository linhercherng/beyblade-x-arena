import{test,expect,type Page}from'@playwright/test';
async function open(p:Page){await p.goto('/tests/fixtures/finish-material-audio.html');await p.locator('#enable').click();await expect.poll(()=>p.evaluate(()=>(window as any).finishMaterialSound.countdownReady)).toBe(true);}

test('連續清理與勝負接續保留既有15ms淡出，不硬切或留下舊播報',async({page})=>{
 await open(page);const state=await page.evaluate(()=>{const w=window as any,s=w.finishMaterialSound;w.finishMaterial('burst','metal',.55,true);const cue=[...s.cues.keys()][0];s.stopEffects();s.stopEffects();const cueFading=s.cueTails.has(cue)&&s.sources.has(cue);s.countdown(3);const voice=s.voicePlayback.source;s.stopEffects();s.stopEffects();s.countdown(2);return{cueFading,voiceFading:s.voiceTails.has(voice)&&s.sources.has(voice),activeVoice:!!s.voicePlayback,cancelled:s.voicePlayback.cancelled};});
 expect(state.cueFading).toBe(true);expect(state.voiceFading).toBe(true);expect(state.activeVoice).toBe(true);expect(state.cancelled).toBe(false);
 await page.locator('#stop').click();await expect.poll(()=>page.evaluate(()=>(window as any).finishMaterialMetrics().voices)).toBe(0);await expect.poll(()=>page.evaluate(()=>(window as any).finishMaterialMetrics().live)).toBe(0);
});

test('重播跳過後短音也淡出，不能跨到下一段倒數',async({page})=>{
 await open(page);await page.evaluate(()=>{const s=(window as any).finishMaterialSound;s.setMusicVolume(0);s.tone(330,.8,'triangle',.6,990);s.stopEffects();});
 await expect.poll(()=>page.evaluate(()=>(window as any).finishMaterialSound.diagnostics().sources),{timeout:500,intervals:[20]}).toBe(0);
});

test('精彩重播結束或跳過後配樂柔順回升，再次清理不重新壓低或補播',async({page})=>{
 await open(page);await page.evaluate(()=>(window as any).finishMaterial('spin','plastic',.55,true));await expect.poll(()=>page.evaluate(()=>(window as any).finishMaterialMetrics().musicDuck)).toBeLessThan(.13);
 await page.evaluate(()=>(window as any).finishMaterialSound.stopEffects());await page.waitForTimeout(100);const gain=await page.evaluate(()=>(window as any).finishMaterialMetrics().musicDuck);expect(gain).toBeGreaterThan(.4);expect(gain).toBeLessThan(.85);
 await expect.poll(()=>page.evaluate(()=>(window as any).finishMaterialMetrics().musicDuck)).toBeGreaterThan(.98);await page.locator('#stop').click();await page.waitForTimeout(50);expect(await page.evaluate(()=>(window as any).finishMaterialMetrics().musicDuck)).toBeGreaterThan(.98);expect(await page.evaluate(()=>(window as any).finishMaterialMetrics().voices)).toBe(0);
});

test('快速切換結果與下一場配樂最多雙曲交叉淡出，暫停後無殘留或過期啟動',async({page})=>{
 await page.goto('/tests/fixtures/audio.html');await page.locator('#results').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().playing)).toBe('results');await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(1);await page.waitForTimeout(550);
 await page.evaluate(()=>{const w=window as any,s=w.audioSound,live=new Set([s.playing.source]),create=s.ctx.createBufferSource.bind(s.ctx);w.musicLoopPeak=1;const initial=s.playing.source;initial.addEventListener('ended',()=>live.delete(initial),{once:true});s.ctx.createBufferSource=()=>{const source=create(),start=source.start.bind(source),disconnect=source.disconnect.bind(source);source.start=(...args:any[])=>{if(source.loop){live.add(source);w.musicLoopPeak=Math.max(w.musicLoopPeak,live.size);}return start(...args);};source.disconnect=(...args:any[])=>{live.delete(source);return disconnect(...args);};source.addEventListener('ended',()=>live.delete(source));return source;};});
 for(let i=0;i<12;i++){await page.locator(i%2?'#results':'#battle').click();await page.waitForTimeout(25);}
 await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().playing)).toBe('results');expect(await page.evaluate(()=>(window as any).musicLoopPeak)).toBeLessThanOrEqual(2);
 await page.locator('#pause').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops),{timeout:500,intervals:[20]}).toBe(0);await page.waitForTimeout(550);expect(await page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(0);
 await page.locator('#battle').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(1);expect(await page.evaluate(()=>(window as any).audioMetrics().peak)).toBeLessThan(.95);
});
