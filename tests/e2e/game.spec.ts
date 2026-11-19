import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import{installProbe}from'./audio-probe.ts';
import{holdFrameAt}from'./frame-hold.ts';
import{profileGame}from'./game-render-profile.ts';
const action = (page: Page, a: string) => page.locator(`[data-action="${a}"]`);
test.afterEach(async({page},info)=>{
 if(info.status===info.expectedStatus)return;
 try{
  const before=await page.evaluate(()=>{const w=window as any;return{audio:w.audioProbe?{...w.audioProbe.metrics(),time:w.audioProbe.ctx.currentTime}:null,screen:document.querySelector('#app')?.getAttribute('data-screen'),paused:!!document.querySelector('#pause-overlay:not([hidden])'),timer:document.querySelector('#battle-time')?.textContent,notice:document.querySelector('#audio-notice-text')?.textContent};});
  await info.attach('native-state-before-controls',{body:JSON.stringify(before),contentType:'application/json'});
  await info.attach('screen-before-controls',{body:await page.screenshot({fullPage:true,timeout:2000}),contentType:'image/png'});
 }catch{}
 try{
  await page.locator('.music-controls').evaluate((node:HTMLDetailsElement)=>node.open=true);await page.getByRole('button',{name:'裝置檢查',exact:true}).click({timeout:1500});
  const [file]=await Promise.all([page.waitForEvent('download',{timeout:2000}),page.getByRole('button',{name:'匯出檢查紀錄',exact:true}).click({timeout:1500})]);
  await info.attach('device-check-after-controls',{path:(await file.path())!,contentType:'application/json'});
 }catch{}
});

test("91張實物圖可載入，3D預覽無溢出，手機卡片保持可辨識", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await action(page, "catalog").first().click();
  const sources = await page
    .locator(".bey-card .product-photo img")
    .evaluateAll((imgs) =>
      imgs.map((img) => (img as HTMLImageElement).getAttribute("src")!),
    );
  expect(new Set(sources).size).toBe(91);
  for (const src of sources)
    expect((await page.request.get(src)).ok(), src).toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".bey-card .product-photo img")
        .first()
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/catalog-real-products.png" });
  await page
    .getByRole("button", { name: /查看.*Dran Sword.*資訊/, exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Dran Sword：實物貼圖/ }),
  ).toBeVisible();
  expect(
    await page.locator(".detail-layout").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [...el.children].every(
        (c) => c.getBoundingClientRect().right <= r.right + 1,
      );
    }),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/dran-sword-real-model.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("searchbox").fill("Dran Brave");
  await page
    .getByRole("button", { name: /查看.*Dran Brave Slash.*資訊/, exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Dran Brave Slash：實物貼圖/ }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/dran-brave-real-model.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("searchbox").fill("");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/catalog-real-products-mobile.png" });
  expect(errors).toEqual([]);
});
for (const version of [1, 2, 3, 4, 5, 6]) test(`已發布v${version}戰績匯入後仍使用舊引擎正確重播`, async ({ page }) => {
  await installProbe(page);
  const m = JSON.parse(readFileSync(`tests/fixtures/v${version}-match.json`, "utf8"));
  const count = { played: 0, wins: 0, streak: 0, bestStreak: 0 };
  const profile = {
    version: 1,
    modes: { cpu: [count, count], local: [count, count] },
    beys: {},
    finishes: { spin: 0, over: 0, burst: 0, extreme: 0 },
    matrix: {},
    recent: [m],
    highs: [],
  };
  await page.goto("/");
  await page.getByLabel('配樂設定',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).audioProbe.metrics().rms)).toBeGreaterThan(.001);
  const clock=await page.evaluate(()=>(window as any).audioProbe.ctx.currentTime);await expect.poll(()=>page.evaluate(()=>(window as any).audioProbe.ctx.currentTime)).toBeGreaterThan(clock+.3);await expect(page.locator('#audio-notice')).toBeHidden();
  await action(page, "stats").click();
  await page.locator("#backup-file").setInputFiles({
    name: `v${version}.json`,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(profile)),
  });
  await page.getByRole("button",{name:"確認覆蓋匯入",exact:true}).click();
  await expect(page.locator("#toast")).toContainText("已匯入");
  await page.locator(".history-row > summary").click();
  const insight=page.locator('.round-insight').first();await insight.locator('summary').click();
  await expect(insight).toContainText('發射力量');await expect(insight).toContainText('因果占比');
  await expect(insight.locator('tbody tr').first()).toContainText(Math.round(m.rounds[0].inputs[0].power*100)+'%');
  await action(page, "replay").first().click();
  const replaySpeed=action(page,'speed');await expect(replaySpeed).toHaveText('1×');
  if(process.env.CI){await replaySpeed.click();await replaySpeed.click();await expect(replaySpeed).toHaveText('4×');}
  const signatures=page.getByRole('group',{name:'陀螺旋向與軸心特徵'});
  await expect(signatures.locator('span')).toHaveCount(2);
  for(const span of await signatures.locator('span').all())await expect(span).toContainText((await span.getAttribute('data-spin'))==='L'?'左迴旋':'右迴旋');
  await expect(page.locator("#toast")).toContainText("結果與原對戰一致", {
    timeout: 60000,
  });
});
test("首屏 3D 畫面與手機寬度正常", async ({ page }) => {
  mkdirSync("artifacts", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
});
async function buildTeam(page: Page) {
  await action(page, "quick").click();
  await action(page, "confirm-team").click();
}
async function playMatch(page: Page, local = false) {
  await page.evaluate(()=>{
    const w=window as any,request=window.requestAnimationFrame.bind(window),pending:FrameRequestCallback[]=[],inputPending:FrameRequestCallback[]=[];let armed=true,resumed=0,inputArmed=false,inputResumed=0;
    window.requestAnimationFrame=cb=>request(time=>{if(inputArmed&&document.querySelector('#app[data-screen="battle"]'))inputPending.push(cb);else if(armed&&document.querySelector('.finish-card'))pending.push(cb);else{if(!armed)resumed++;if(!inputArmed)inputResumed++;cb(time);}});
    w.armBattleInput=()=>{inputArmed=true;inputResumed=0;};
    w.battleInputFrames=()=>({held:inputPending.length,resumed:inputResumed});
    w.releaseBattleInput=()=>{inputArmed=false;for(const cb of inputPending.splice(0))window.requestAnimationFrame(cb);};
    w.finishPauseFrames=()=>({held:pending.length,resumed});
    w.releaseFinishPause=()=>{armed=false;for(const cb of pending.splice(0))window.requestAnimationFrame(cb);};
  });
  await action(page, "begin-match").click();
  let rounds = 0;
  while (rounds++ < 14) {
    await expect(action(page, "lock").first()).toBeVisible();
    await page.evaluate(()=>(window as any).armBattleInput());
    if(local)await page.getByRole("group",{name:"1P 傾斜方向"}).getByRole("button",{name:"外切",exact:true}).click();
    else await page.getByLabel("1P 傾斜方向").selectOption("1");
    await page.getByLabel("1P 發射傾角").press("End");
    await expect(page.getByLabel("1P 發射傾角")).toHaveValue("30");
    if(local){
      await page.getByRole("group",{name:"2P 傾斜方向"}).getByRole("button",{name:"內切",exact:true}).click();
      await page.getByLabel("2P 發射傾角").press("Home");
    }
    await page.locator("h1").click();
    await page.keyboard.press("a");
    await page.keyboard.press("Space");
    if(local)await expect(page.getByRole("group",{name:"1P 傾斜方向"}).getByRole("button").first()).toBeDisabled();
    if (local) {
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
    }
    await expect(page.locator("#app")).toHaveAttribute(
      "data-screen",
      "battle",
      { timeout: process.env.CI ? 30000 : 12000 },
    );
    // Capture the real battle input window before slow camera/screenshot work can finish a round.
    try{
      await expect.poll(()=>page.evaluate(()=>(window as any).battleInputFrames().held)).toBeGreaterThan(0);
      await page.keyboard.press("Space");
      await expect(action(page, "shout").first()).toBeDisabled();
      if(local){await page.keyboard.press("Enter");await expect(action(page,"shout").nth(1)).toBeDisabled();}
      while((await action(page,"speed").textContent())!=="1×")await action(page,"speed").click();
    }finally{await page.evaluate(()=>(window as any).releaseBattleInput());}
    await expect.poll(()=>page.evaluate(()=>(window as any).battleInputFrames().resumed)).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(()=>(window as any).battleInputFrames().held)).toBe(0);
    if (
      (await action(page, "close-up").getAttribute("aria-pressed")) !== "true"
    )
      await action(page, "close-up").click();
    await expect(action(page, "close-up")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    if (rounds === 1) {
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: local
          ? "artifacts/battle-close-local.png"
          : "artifacts/battle-close-desktop.png",
      });
    }
    await action(page, "close-up").click();
    // 展示時長可切換 4 倍，但模擬仍採同一固定步長。
    while ((await action(page, "speed").textContent()) !== "4×")
      await action(page, "speed").click();
    if (rounds === 1) {
      try{
      await expect.poll(()=>page.evaluate(()=>(window as any).finishPauseFrames().held),{timeout:45000}).toBeGreaterThan(0);
      await expect(page.locator(".finish-card")).toBeVisible({ timeout: 45000 });
      await expect.poll(() => page.locator(".finish-score").evaluate(el => getComputedStyle(el).opacity)).toBe("1");
      await action(page,'pause').first().evaluate(button=>button.addEventListener('click',()=>{
        const animation=document.querySelector('.finish-score')!.getAnimations()[0],timing=animation.effect!.getTiming();
        animation.currentTime=Number(timing.delay)+Number(timing.duration)/2;
        (window as any).finishAnimationProbe={animation,running:animation.playState==='running'};
      },{once:true,capture:true}));
      await action(page, "pause").first().click();
      await expect(page.locator('#pause-overlay')).toBeVisible();
      expect(await page.evaluate(()=>{const p=(window as any).finishAnimationProbe;return p.running&&p.animation.playState==='paused';})).toBe(true);
      await page.evaluate(()=>(window as any).releaseFinishPause());
      const times = await page.locator(".finish-card").evaluate(async el => {const animations=el.getAnimations({subtree:true});await Promise.all(animations.map(a=>a.ready));return animations.map(a=>a.currentTime);});
      expect(await page.evaluate(()=>{const a=(window as any).finishAnimationProbe.animation;return a.pending||a.playState!=='paused';})).toBe(false);
      await expect(page.locator(".finish-victor")).toContainText(/WIN|出場順序/);
      expect(await page.locator(".finish-card").evaluate(el => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
      await page.screenshot({ path: local ? "artifacts/finish-live-mobile-v080.png" : "artifacts/finish-live-desktop-v080.png" });
      await expect.poll(()=>page.evaluate(()=>(window as any).finishPauseFrames().resumed)).toBeGreaterThanOrEqual(2);
      expect(await page.evaluate(()=>(window as any).finishPauseFrames().held)).toBe(0);
      await page.waitForTimeout(100);
      expect(await page.locator(".finish-card").evaluate(el => el.getAnimations({subtree:true}).map(a => a.currentTime))).toEqual(times);
      await action(page, "pause").first().click();
      await expect.poll(()=>page.evaluate(()=>(window as any).finishAnimationProbe.animation.playState)).not.toBe('paused');
      }finally{await page.evaluate(()=>(window as any).releaseFinishPause?.()).catch(()=>{});}
    }
    await expect(
      page.locator('[data-action="next-round"], [data-action="rematch"]'),
    ).toBeVisible({ timeout: 45000 });
    const analysis=page.locator('.round-insight').first();await analysis.locator('summary').click();
    await expect(analysis).toContainText('最大單次衝量');await expect(analysis).toContainText('數據取自本場保存紀錄');
    if (await action(page, "rematch").isVisible()) {
      await expect(page.locator(".victory-podium")).toBeVisible();
      await expect(page.locator(".winning-team .product-photo")).toHaveCount(3);
      return;
    }
    await action(page, "next-round").click();
  }
  throw new Error("超過14場仍未結算");
}
test("桌面：圖鑑、3D卡牌、完整1P、戰績重載、重播與無效備份", async ({
  page,
},info) => {
  if(process.env.CI)test.setTimeout(600000);
  await profileGame(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(process.env.CI?"/?software-gpu":"/");
  await expect(
    page.getByRole("heading", { name: "準備好，突破極限。" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await action(page, "catalog").first().click();
  await expect(page.locator(".bey-card")).toHaveCount(91);
  await page.getByRole("searchbox").fill("Wizard Rod");
  await expect(page.locator(".bey-card")).toHaveCount(1);
  await page.locator(".art-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#detail-stage canvas")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("2024-03-30");
  await expect(page.getByRole("dialog")).toContainText("個體特性 · V1");
  await expect(page.getByRole("dialog")).toContainText("非實測重量");
  await page.screenshot({ path: "artifacts/card-desktop.png" });
  await page.keyboard.press("Escape");
  await action(page, "play").first().click();
  await buildTeam(page);
  await playMatch(page);
  await page.screenshot({
    path: "artifacts/results-desktop.png",
    fullPage: true,
  });
  await expect(page.locator("h1")).toContainText(/漂亮的一戰|再挑戰/);
  await action(page, "stats").click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.reload();
  await action(page, "stats").click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.locator(".history-row > summary").click();
  await action(page, "replay").first().click();
  await expect(page.locator("h1")).toHaveText("對戰重播");
  await action(page, "speed").click();
  await action(page, "speed").click();
  await expect(page.locator('#toast')).toContainText('結果與原對戰一致',{timeout:process.env.CI?90000:45000});await expect(action(page,'pause').first()).toContainText('從頭重播');
  await action(page,"exit").click();
  await expect(page.locator("h1")).toHaveText("每一場，都留下軌跡。");
  await page.locator("#backup-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.locator("#toast")).toContainText("備份格式無效");
  await expect(page.locator(".history-row")).toHaveCount(1);
  const download = page.waitForEvent("download");
  await action(page, "export").click();
  const d = await download;
  await d.saveAs("artifacts/backup.json");
  const saved=JSON.parse(readFileSync("artifacts/backup.json","utf8")).recent[0];
  expect(saved.rounds.every((r:any)=>r.engineVersion===6&&r.traitVersion===1)).toBe(true);
  expect(saved.rounds[0].inputs[0]).toMatchObject({angle:30,direction:1});
  await page.locator("#backup-file").setInputFiles("artifacts/backup.json");
  await page.getByRole("button",{name:"確認覆蓋匯入",exact:true}).click();
  await expect(page.locator("#toast")).toContainText("已匯入");
  if(process.env.CI){const profiles=await page.evaluate(()=>(window as any).gameRenderProfiles?.map((info:()=>unknown)=>info())??[]);await info.attach('game-render-profile',{body:JSON.stringify({scope:'software-gpu-interactive-full-scene',profiles}),contentType:'application/json'});expect(profiles.length).toBeGreaterThan(0);expect(profiles.every((p:any)=>p.softwareGpu&&!p.audioOnly)).toBe(true);}
  expect(errors).toEqual([]);
});
test("手機：響應式配置與2P遮蔽、鍵盤分鍵、完整一局", async ({ page },info) => {
  await profileGame(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(process.env.CI?"/?software-gpu":"/");
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('[data-action="mode"][data-value="local"]').click();
  await action(page, "play").first().click();
  await buildTeam(page);
  await expect(page.locator("h1")).toHaveText("請交給 2P 玩家");
  await expect(page.locator(".bey-card")).toHaveCount(0);
  await action(page, "handoff").click();
  await buildTeam(page);
  await playMatch(page, true);
  await expect(page.locator("h1")).toContainText(/漂亮的一戰|2P，拿下勝利/);
  await page.screenshot({ path: "artifacts/results-mobile-v080.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await action(page, "stats").click();
  await page.locator('[data-action="stats-mode"][data-value="local"]').click();
  await expect(page.locator(".stats-metrics").first()).toContainText("1");
  await page.screenshot({ path: "artifacts/stats-mobile.png", fullPage: true });
  if(process.env.CI){const profiles=await page.evaluate(()=>(window as any).gameRenderProfiles?.map((info:()=>unknown)=>info())??[]);await info.attach('game-render-profile',{body:JSON.stringify({scope:'software-gpu-interactive-full-scene',profiles}),contentType:'application/json'});expect(profiles.length).toBeGreaterThan(0);expect(profiles.every((p:any)=>p.softwareGpu&&!p.audioOnly)).toBe(true);}
  expect(errors).toEqual([]);
});
test("暫停時鍵盤不會繞過遮罩鎖定發射，恢復後可正常倒數", async ({ page }) => {
  await holdFrameAt(page,'#app[data-screen="countdown"] #battle-message .count-beat');
  try{
  await page.goto("/");
  await action(page, "play").first().click();
  await buildTeam(page);
  await action(page, "begin-match").click();
  await page.locator("#pause-button").click();
  await expect(page.locator("#pause-overlay")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "launch");
  await expect(action(page, "lock").first()).toBeEnabled();
  await page.locator('#pause-overlay [data-action="pause"]').click();
  await page.keyboard.press("Space");
  await expect(page.locator("#app")).toHaveAttribute(
    "data-screen",
    "countdown",
  );
  await expect(page.locator("#pause-overlay")).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>(window as any).stageFrameHold.state().held)).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(page.locator('#pause-overlay')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-screen','countdown');
  const frozenCue=await page.locator('#battle-message .count-beat').innerText();expect(['3','2','1']).toContain(frozenCue);
  await page.evaluate(()=>(window as any).stageFrameHold.release());
  await expect.poll(()=>page.evaluate(()=>(window as any).stageFrameHold.state().resumed)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>(window as any).stageFrameHold.state().held)).toBe(0);
  await page.evaluate(() => {
    const start = performance.now();
    while (performance.now() - start < 3500) {
      /* 模擬分頁停止 rAF */
    }
  });
  await expect(page.locator('#battle-message .count-beat')).toHaveText(frozenCue);
  await page.evaluate(()=>{
    const w=window as any,values:string[]=[];const capture=()=>{const text=document.querySelector('#battle-message .count-beat,#battle-message .shoot')?.textContent;if(text&&text!==values.at(-1))values.push(text);};capture();
    w.keyboardCountdownValues=values;w.keyboardCountdownObserver=new MutationObserver(capture);w.keyboardCountdownObserver.observe(document,{childList:true,characterData:true,subtree:true});
    const resume=document.querySelector('#pause-overlay [data-action="pause"]')!;document.addEventListener('click',event=>{if(event.composedPath().includes(resume))w.keyboardCountdownResumedScreen=document.querySelector('#app')?.getAttribute('data-screen');},{once:true});
  });
  await page.locator('#pause-overlay [data-action="pause"]').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).keyboardCountdownResumedScreen)).toBe('countdown');
  await expect(page.locator('#pause-overlay')).toBeHidden();
  await expect(page.locator("#app")).toHaveAttribute("data-screen", "battle", {
    timeout: 10000,
  });
  const observed=await page.evaluate(()=>(window as any).keyboardCountdownValues);writeFileSync(`artifacts/keyboard-countdown-${process.env.CI?'software':'native'}-v0430.json`,JSON.stringify({frozenCue,observed},null,2));
  expect(observed).toEqual([...['3','2','1'].slice(['3','2','1'].indexOf(frozenCue)),'GO SHOOT!']);await page.evaluate(()=>(window as any).keyboardCountdownObserver.disconnect());
  }finally{await page.evaluate(()=>(window as any).stageFrameHold?.release()).catch(()=>{});}
});
test("瀏覽器禁用設定儲存時可啟動與切換音效", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage blocked by policy", "SecurityError");
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("準備好，突破極限。");
  await page.getByRole("button", { name: "切換音效" }).click();
  await expect(page.getByRole("button", { name: "切換音效" })).toHaveText(
    "音效 關",
  );
  await action(page, "play").first().click();
  await expect(page.locator("h1")).toHaveText("1P，你的三顆王牌。");
  expect(errors).toEqual([]);
});
