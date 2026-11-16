import{test,expect,type Page}from'@playwright/test';import{musicLevel}from'../../src/impact.ts';
async function open(p:Page){await p.goto('/tests/fixtures/audio.html');await p.locator('#results').click();await expect.poll(()=>p.evaluate(()=>(window as any).audioSound.countdownReady)).toBe(true);await expect.poll(()=>p.evaluate(()=>(window as any).audioSound.playing?.mode)).toBe('results');await p.waitForTimeout(550);}

test('配樂歸零後快速恢復，舊曲尾音先結束，不被新音量喚回',async({page})=>{
 await open(page);await page.evaluate(()=>{const w=window as any,s=w.audioSound,old=s.playing.source;w.retiredEnded=false;old.addEventListener('ended',()=>w.retiredEnded=true);s.setMusicVolume(0);s.update(null,false,'results');s.setMusicVolume(1);});
 await expect.poll(()=>page.evaluate(()=>(window as any).retiredEnded),{timeout:100,intervals:[10]}).toBe(true);await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.playing?.mode)).toBe('results');await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(1);expect(await page.evaluate(()=>(window as any).audioMetrics().peak)).toBeLessThan(.95);
});

test('快速靜音再開啟不留下舊曲與播報尾音，也不補播終結語音',async({page})=>{
 await open(page);const before=await page.evaluate(()=>{const w=window as any,s=w.audioSound;s.setMusicVolume(.4);s.finish({winner:0,finish:'burst',points:2,time:20});const old=s.playing.source,voice=s.voicePlayback.source;w.retiredEnded=w.oldVoiceEnded=false;old.addEventListener('ended',()=>w.retiredEnded=true);voice.addEventListener('ended',()=>w.oldVoiceEnded=true);s.toggle();s.update(null,false,'results');s.toggle();return s.volume;});
 await expect.poll(()=>page.evaluate(()=>(window as any).retiredEnded),{timeout:100,intervals:[10]}).toBe(true);await expect.poll(()=>page.evaluate(()=>(window as any).oldVoiceEnded)).toBe(true);expect(await page.evaluate(()=>(window as any).audioSound.voicePlayback)).toBe(null);expect(await page.evaluate(()=>(window as any).audioSound.cues.size)).toBe(0);expect(await page.evaluate(()=>(window as any).audioSound.volume)).toBe(before);await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(1);expect(await page.evaluate(()=>(window as any).audioMetrics().peak)).toBeLessThan(.95);
});

test('快速連續調音量以最後設定為準，跨曲目保持增益與儲存值一致',async({page})=>{
 await open(page);await page.evaluate(()=>{const s=(window as any).audioSound;s.setMusicVolume(0);s.update(null,false,'results');s.setMusicVolume(1);s.update(null,false,'battle');for(let i=0;i<60;i++)s.setMusicVolume((i%11)/10);s.setMusicVolume(.35);s.update(null,false,'results');});
 await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.music.gain.value)).toBeCloseTo(musicLevel(.35,'results'),3);await page.locator('#battle').click();await expect.poll(()=>page.evaluate(()=>(window as any).audioSound.music.gain.value)).toBeCloseTo(musicLevel(.35,'battle'),3);expect(await page.evaluate(()=>localStorage.getItem('spinforge-music-volume'))).toBe('0.35');expect(await page.evaluate(()=>(window as any).audioMetrics().volume)).toBe(.35);
});

test('配樂音量歸零仍可播放新語音，重新開啟不補播過去語音',async({page})=>{
 await open(page);await page.locator('#volume').fill('0');await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(0);await page.evaluate(()=>{const w=window as any;w.spoken=(window as any).audioSound.countdown(3);});await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().rms)).toBeGreaterThan(.003);await expect.poll(()=>page.evaluate(()=>(window as any).spoken.complete)).toBe(true);await page.locator('#volume').fill('.4');await expect.poll(()=>page.evaluate(()=>(window as any).audioMetrics().loops)).toBe(1);expect(await page.evaluate(()=>(window as any).audioSound.voicePlayback)).toBe(null);
});

test('正式音量與靜音設定跨單人雙人、選隊及重新載入保持一致',async({page})=>{
 await page.goto('/');await page.getByLabel('配樂設定',{exact:true}).click();const slider=page.getByLabel('背景音樂音量',{exact:true});await slider.press('Home');for(let i=0;i<7;i++)await slider.press('ArrowRight');await expect(slider).toHaveValue('35');await page.getByRole('button',{name:'切換音效',exact:true}).click();
 for(const mode of ['local','cpu']){await page.locator('[data-action=mode][data-value='+mode+']').click();await expect(page.locator('#music-volume')).toHaveValue('35');await expect(page.getByRole('button',{name:'切換音效',exact:true})).toHaveText('音效 關');}
 await page.locator('[data-action=play]').first().click();await expect(page.locator('#music-volume')).toHaveValue('35');await expect(page.getByRole('button',{name:'切換音效',exact:true})).toHaveText('音效 關');await page.reload();await expect(page.locator('#music-volume')).toHaveValue('35');await expect(page.getByRole('button',{name:'切換音效',exact:true})).toHaveText('音效 關');await page.getByRole('button',{name:'切換音效',exact:true}).click();await expect(page.getByRole('button',{name:'切換音效',exact:true})).toHaveText('音效 開');expect(await page.evaluate(()=>localStorage.getItem('spinforge-music-volume'))).toBe('0.35');
});
