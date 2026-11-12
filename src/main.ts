import "./style.css";
import { modelSpec } from "./bey-model.ts";
import {
  BEYS,
  CHINESE_NAMES,
  TYPE,
  STAT_LABEL,
  bits,
  getBey,
  filterBeys,
  type Bey,
  type Stats,
} from "./catalog.ts";
import { Arena } from "./arena.ts";
import { capturePoses, type TopPose } from "./motion.ts";
import { Sound } from "./audio.ts";
import {
  createBattle,
  stepBattle,
  shout,
  DT,
  FINISH,
  type Battle,
  type Launch,
} from "./physics.ts";
import {
  createMatch,
  applyRound,
  roundSeed,
  selectCpu,
  cpuLaunch,
  scoreMatch,
  DIFFICULTY,
  type Match,
  type Difficulty,
  type Mode,
  type Round,
} from "./match.ts";
import {
  freshProfile,
  loadProfile,
  saveProfile,
  recordMatch,
  parseBackup,
  exportProfile,
  playerHabit,
  type Profile,
} from "./storage.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;
const sound = new Sound();
let arena: Arena | null = null;
try {
  arena = new Arena();
} catch (e) {
  console.error(e);
}
type Screen =
  | "home"
  | "catalog"
  | "team"
  | "privacy"
  | "reveal"
  | "launch"
  | "countdown"
  | "battle"
  | "round"
  | "results"
  | "stats"
  | "replay";
let screen: Screen = "home",
  mode: Mode = "cpu",
  difficulty: Difficulty = "normal";
let profile: Profile = freshProfile(),
  persisted = true;
let teamPlayer = 0,
  teams: Bey[][] = [[], []],
  match: Match | null = null,
  battle: Battle | null = null;
let inputs: Launch[] = [
    { power: 0.9, lane: 1, angle: 10 },
    { power: 0.9, lane: 1, angle: 10 },
  ],
  locked = [false, false];
let filter = { query: "", line: "all", type: "all", sort: "code" };
let paused = false,
  pauseStarted = 0,
  speed = 1,
  accumulator = 0,
  lastFrame = 0,
  now = 0,
  countdownStart = 0,
  finishStart = 0,
  processed = false;
let detailId: string | null = null,
  modalReturnBeys: Bey[] = [];
let previousPoses: TopPose[] = [];
let lastHudTime = 0;
let replay: Round | null = null,
  replayMatch: Match | null = null,
  historyId: string | null = null,
  statsMode: Mode = "cpu";
let toastTimer: ReturnType<typeof setTimeout>;
const safe = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const byId = (id: string) => document.getElementById(id);
const pct = (w: number, n: number) => (n ? Math.round((w / n) * 100) : 0);
const date = (s: string) =>
  new Date(s).toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
  });
function toast(message: string) {
  const el = byId("toast")!;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
}
const btn = (label: string, action: string, cls = "", extra = "") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const tag = (b: Bey) =>
  `<span class="type-tag" style="--type:${b.color}">${TYPE[b.type].icon} ${TYPE[b.type].label}</span>`;
const beyName = (b: Bey) =>
  `<span class="bey-name">${safe(b.zhName)}<small>${safe(b.name)}</small></span>`;
function art(b: Bey, size = 100) {
  const image = modelSpec(b).photo;
  const [x, y, w, h] = image.imageBounds;
  const scale = 1 / Math.max(w * image.width, h * image.height);
  const width = image.width * scale * 100,
    height = image.height * scale * 100;
  const left = 50 - (x + w / 2) * width,
    top = 50 - (y + h / 2) * height;
  return `<span class="bey-art product-photo ${image.transparent ? "" : "photo-white"}" style="--art-size:${size}px"><img src="${image.src}" alt="${safe(b.zhName)} / ${safe(image.label)}" loading="lazy" decoding="async" style="width:${width}%;height:${height}%;left:${left}%;top:${top}%"/></span>`;
}
function radar(b: Bey) {
  const keys = Object.keys(STAT_LABEL) as (keyof Stats)[];
  const point = (i: number, r: number) =>
    `${110 + Math.sin((i * Math.PI) / 3) * r},${108 - Math.cos((i * Math.PI) / 3) * r}`;
  return `<svg viewBox="0 0 220 220" class="radar" role="img" aria-label="${keys.map((k) => STAT_LABEL[k] + b.stats[k]).join("，")}">${[22, 44, 66].map((r) => `<polygon points="${keys.map((_, i) => point(i, r)).join(" ")}" fill="none" stroke="#334354"/>`).join("")}${keys.map((k, i) => `<line x1="110" y1="108" x2="${point(i, 66).split(",")[0]}" y2="${point(i, 66).split(",")[1]}" stroke="#334354"/><text x="${point(i, 88).split(",")[0]}" y="${Number(point(i, 88).split(",")[1]) + 4}" text-anchor="middle" fill="#bac5d0" font-size="11">${STAT_LABEL[k]}</text>`).join("")}<polygon points="${keys.map((k, i) => point(i, (b.stats[k] / 100) * 66)).join(" ")}" fill="${b.color}" fill-opacity=".22" stroke="${b.color}" stroke-width="2"/></svg>`;
}
function shell(content: string) {
  app.dataset.screen = screen;
  app.classList.toggle(
    "arena-view",
    ["launch", "countdown", "battle", "replay"].includes(screen),
  );
  const active =
    screen === "catalog"
      ? "catalog"
      : screen === "stats"
        ? "stats"
        : screen === "home"
          ? "home"
          : "play";
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#" data-action="home" aria-label="極限陀螺競技場主選單"><span class="brand-symbol">X</span><span>SPINFORGE<span class="brand-sub">EXTREME ARENA</span></span></a><span class="nav-label">PLAY YOUR EDGE</span><nav aria-label="主導覽">${[
    ["home", "⌂", "作戰基地"],
    ["play", "⚔", "開始對戰"],
    ["catalog", "◎", "陀螺圖鑑"],
    ["stats", "▤", "戰績中心"],
  ]
    .map(([id, icon, label]) =>
      btn(
        `<span class="nav-icon">${icon}</span><span>${label}</span>${id === "catalog" ? "<small>83</small>" : ""}`,
        id,
        `nav-item ${active === id ? "active" : ""}`,
      ),
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><div class="connection"><i></i> 本機紀錄 · ${persisted ? "自動保存" : "暫存模式"}</div><p>實物參考・粉絲遊戲<br>版本 0.5.0</p>${btn("遊戲規則 ↗", "help", "text-button")}</div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">競技場 <span>/</span> <strong>${({ home: "作戰基地", catalog: "陀螺圖鑑", team: "隊伍編成", privacy: "交接玩家", reveal: "出場順序", launch: "準備發射", countdown: "準備發射", battle: "即時對戰", round: "對決結果", results: "賽後結算", stats: "戰績中心", replay: "對戰重播" } as Record<Screen, string>)[screen]}</strong></div><div class="top-actions"><span class="local-badge">LOCAL ARENA</span>${btn(sound.muted ? "音效 關" : "音效 開", "sound", "icon-button", 'aria-label="切換音效"')}${btn("?", "help", "help-button", 'aria-label="遊戲規則"')}<span class="avatar">P1</span></div></header><main id="main">${content}</main><footer class="footer"><span>SPINFORGE X <b>·</b> 挑戰你的極限</span><span>3 ON 3 <b>／</b> FIRST TO 4 POINTS</span></footer></div><div id="modal-root"></div>`;
  window.scrollTo(0, 0);
  attachStage();
}
function attachStage() {
  const host = byId("stage");
  if (host) {
    if (arena) arena.attach(host, screen === "home" ? "home" : "battle");
    else
      host.innerHTML =
        '<div class="webgl-error">此裝置未能啟用 WebGL 2。請以最新版 Chrome／Edge 開啟，並啟用硬體加速。</div>';
  }
}
function title(eyebrow: string, h: string, description: string, side = "") {
  return `<div class="page-title"><div><div class="eyebrow">${eyebrow}</div><h1>${h}</h1><p>${description}</p></div>${side}</div>`;
}
function home() {
  screen = "home";
  battle = null;
  replay = null;
  paused = false;
  arena?.setBeys([BEYS[0], BEYS[11]]);
  const c = profile.modes.cpu[0];
  shell(
    `${title("YOUR NEXT BATTLE STARTS HERE", "準備好，突破極限。", "選好你的三顆搭檔，讓每一次碰撞都決定勝負。", `<span class="season"><i></i> ARENA / 01</span>`)}<div class="home-layout"><section class="hero-arena"><div class="arena-corner"><span class="live-dot"></span> LIVE SIMULATION <span>3D 競技場</span></div><div class="arena-copy"><span class="eyebrow">LET IT RIP.</span><h2>一擊，<br>扭轉戰局<span>。</span></h2><p>金屬碰撞、齒軌衝刺。<br>你的隊伍，你的致勝一瞬。</p></div><div id="stage" class="home-stage"></div><div class="hero-bottom"><span><i></i> REAL-TIME PHYSICS</span><span>拖曳競技場旋轉視角 ↔</span></div><div class="arena-watermark">X</div></section><section class="setup panel"><div class="section-index">01 <span>／ 選擇你的挑戰</span></div><h2>進入競技場</h2><p class="muted">三顆陀螺。四分定勝負。</p><div class="mode-options">${btn('<span class="mode-icon">↗</span><span><strong>單人挑戰</strong><small>1P vs CPU</small></span><span class="radio"></span>', "mode", "mode-card " + (mode === "cpu" ? "selected" : ""), 'data-value="cpu"')}${btn('<span class="mode-icon">⚔</span><span><strong>同機對戰</strong><small>1P vs 2P</small></span><span class="radio"></span>', "mode", "mode-card " + (mode === "local" ? "selected" : ""), 'data-value="local"')}</div><label class="field-label" for="difficulty">電腦難度</label><div class="difficulty-options">${Object.entries(
      DIFFICULTY,
    )
      .map(([key, label]) =>
        btn(
          label,
          "difficulty",
          difficulty === key ? "selected" : "",
          `data-value="${key}" ${mode === "local" ? "disabled" : ""}`,
        ),
      )
      .join(
        "",
      )}</div><div class="difficulty-note">${mode === "local" ? "輪流選隊，再同時發射。" : difficulty === "hard" ? "精準發射，依你的過往出場習慣反制。" : difficulty === "normal" ? "三種類型互補，適合熟悉對戰節奏。" : "輕鬆上手，從第一次完美發射開始。"}</div>${btn("組建隊伍 <span>→</span>", "play", "primary start-button", !arena ? "disabled" : "")}<div class="controls-note"><span>⌨ 滑鼠 / 鍵盤</span><span>◉ 支援觸控</span></div></section></div><section class="home-bottom"><div class="quick-stats"><div><small>你的對戰場次</small><strong>${String(c.played).padStart(2, "0")}<span>場</span></strong></div><div><small>單人勝率</small><strong>${pct(c.wins, c.played)}<span>%</span></strong></div><div><small>最長連勝</small><strong>${String(c.bestStreak).padStart(2, "0")}<span>WIN</span></strong></div></div><button class="catalog-callout" data-action="catalog"><div class="mini-beys">${art(BEYS[0], 65)}${art(BEYS[2], 65)}${art(BEYS[1], 65)}</div><div><span class="eyebrow">FIND YOUR PARTNER</span><h3>83 顆陀螺，無限種戰術。</h3><p>探索 BX / UX / CX 全系列圖鑑</p></div><span class="round-arrow">↗</span></button></section><div class="rule-strip"><span><b>01</b> 選三顆</span><i>→</i><span><b>02</b> 排出場順序</span><i>→</i><span><b>03</b> 蓄力發射</span><i>→</i><span><b>04</b> 先得 4 分獲勝</span><small>獨立物理模擬 · 實物參考與合成音效</small></div>`,
  );
}
function filters() {
  return `<div class="filter-bar"><label class="search-box"><span>⌕</span><input id="search" type="search" placeholder="搜尋名稱、型號或零件…" value="${safe(filter.query)}" aria-label="搜尋陀螺"/></label><div class="line-tabs">${["all", "BX", "UX", "CX"].map((l) => btn(l === "all" ? "全部" : l, "line", filter.line === l ? "selected" : "", `data-value="${l}"`)).join("")}</div><select id="type-filter" aria-label="類型篩選"><option value="all">所有類型</option>${Object.entries(
    TYPE,
  )
    .map(
      ([t, v]) =>
        `<option value="${t}" ${filter.type === t ? "selected" : ""}>${v.icon} ${v.label}</option>`,
    )
    .join(
      "",
    )}</select><select id="sort" aria-label="排序"><option value="code">型號排序</option><option value="atk" ${filter.sort === "atk" ? "selected" : ""}>攻擊優先</option><option value="sta" ${filter.sort === "sta" ? "selected" : ""}>持久優先</option></select></div>`;
}
function cards() {
  const beys = filterBeys(filter.query, filter.line, filter.type, filter.sort);
  return `<div class="results-count">${beys.length} 顆陀螺 <span>性能數值為遊戲平衡設定</span></div><div class="bey-grid">${beys
    .map((b) => {
      const index = teams[teamPlayer].findIndex((v) => v.id === b.id),
        selected = screen === "team" && index >= 0;
      return `<article class="bey-card ${selected ? "chosen" : ""}" style="--type:${b.color}"><div class="card-meta"><span>${b.code} <em>${b.line}</em></span>${tag(b)}</div><button class="art-button" data-action="detail" data-id="${b.id}" aria-label="查看 ${safe(b.zhName)}（${b.name}）資訊">${art(b, 130)}<span class="art-detail">查看卡牌 ↗</span></button><div class="card-content"><h2>${beyName(b)}</h2><div class="combo">${b.ratchet.startsWith("integrated") ? "一體式" : b.ratchet} / ${b.bit} <span>${b.spin === "L" ? "↶ 左旋" : "↷ 右旋"}</span></div><p>${safe(b.feature)}</p><div class="mini-stats"><span>攻 <b>${b.stats.atk}</b></span><span>防 <b>${b.stats.def}</b></span><span>持 <b>${b.stats.sta}</b></span></div>${screen === "team" ? btn(selected ? `已選 ${["先鋒", "中堅", "大將"][index]} ✓` : "加入隊伍 ＋", "select", selected ? "select-bey selected" : "select-bey", `data-id="${b.id}" ${!selected && teams[teamPlayer].length === 3 ? "disabled" : ""}`) : btn("卡牌詳細資料 ↗", "detail", "detail-link", `data-id="${b.id}"`)}</div></article>`;
    })
    .join(
      "",
    )}</div>${!beys.length ? '<div class="empty-state">找不到符合條件的陀螺，試試其他關鍵字。</div>' : ""}`;
}
function catalog() {
  screen = "catalog";
  shell(
    `${title("BEY ARCHIVE", "找到你的致勝搭檔。", "83 顆原廠組合。點開卡牌，探索零件與獨特性能。", btn("開始組隊 →", "play", "primary"))}${filters()}<div id="catalog-list">${cards()}</div><p class="source-note">類型與日本發售日已依 Takara Tomy 官方資料核對；未來商品標示為預定。實物圖引自 BeyGear 與官方商品頁；3D 輪廓為近似，數值為遊戲設定。</p>`,
  );
}
function startTeam() {
  battle = null;
  replay = null;
  teams = [[], []];
  teamPlayer = 0;
  filter = { query: "", line: "all", type: "all", sort: "code" };
  screen = "team";
  renderTeam();
}
function lineup(player: number, editable = false) {
  return `<div class="lineup">${[0, 1, 2]
    .map((i) => {
      const b = teams[player][i];
      return `<div class="lineup-slot ${b ? "filled" : ""}"><span class="slot-number">0${i + 1}</span><span class="slot-label">${["先鋒", "中堅", "大將"][i]}</span>${b ? `${art(b, 60)}<span class="slot-name">${safe(b.zhName)}<small>${safe(b.name)} · ${b.ratchet.startsWith("integrated") ? "一體式" : b.ratchet}${b.bit}</small></span>${editable ? `<div class="slot-tools">${btn("↑", "move", "", `data-index="${i}" data-direction="-1" aria-label="上移 ${b.name}" ${i === 0 ? "disabled" : ""}`)}${btn("↓", "move", "", `data-index="${i}" data-direction="1" aria-label="下移 ${b.name}" ${i === 2 ? "disabled" : ""}`)}${btn("×", "select", "", `data-id="${b.id}" aria-label="移除 ${b.name}"`)}</div>` : ""}` : '<span class="slot-placeholder">等待選擇陀螺</span>'}</div>`;
    })
    .join("")}</div>`;
}
function renderTeam() {
  screen = "team";
  shell(
    `${title("BUILD YOUR DECK", `${teamPlayer === 0 ? "1P" : "2P"}，你的三顆王牌。`, "點選三顆不同戰刃，並以箭頭調整出場順序。", btn("快速組隊 ↗", "quick", "secondary"))}<div class="team-layout"><section>${filters()}<div id="catalog-list">${cards()}</div></section><aside class="team-panel panel"><div class="section-index">YOUR LINEUP <span>${teams[teamPlayer].length} / 3</span></div><h2>${teamPlayer === 0 ? "1P" : "2P"} 出場順序</h2><p class="muted">順序公開後即鎖定</p>${lineup(teamPlayer, true)}<div class="team-advice">↗ 攻擊剋持久 · 持久剋防禦 · 防禦剋攻擊<br>相性來自物理表現，沒有額外傷害倍率。</div>${btn("確認隊伍 →", "confirm-team", "primary", teams[teamPlayer].length !== 3 ? "disabled" : "")}</aside></div>`,
  );
}
function confirmTeam() {
  if (teams[teamPlayer].length !== 3) return;
  if (mode === "local" && teamPlayer === 0) {
    screen = "privacy";
    shell(
      `<section class="handoff panel"><span class="eyebrow">PASS THE DEVICE</span><div class="handoff-icon">⇄</div><h1>請交給 2P 玩家</h1><p>1P 的隊伍已隱藏。<br>準備好後，再開始你的編成。</p>${btn("2P 已準備好 →", "handoff", "primary")}</section>`,
    );
    return;
  }
  if (mode === "cpu") {
    teams[1] = selectCpu(
      difficulty,
      crypto.getRandomValues(new Uint32Array(1))[0],
      teams[0],
      playerHabit(profile),
    );
  }
  reveal();
}
function reveal() {
  screen = "reveal";
  shell(
    `${title("THE DECKS ARE LOCKED", "王牌，即將正面交鋒。", "雙方隊伍已公開，出場順序已鎖定。")}<div class="reveal-teams">${[0, 1].map((p) => `<section class="panel"><div class="eyebrow">${p === 0 ? "PLAYER 01" : mode === "cpu" ? "CPU / " + DIFFICULTY[difficulty] : "PLAYER 02"}</div><h2>${p === 0 ? "你的隊伍" : mode === "cpu" ? "電腦隊伍" : "挑戰者隊伍"}</h2>${lineup(p)}</section>`).join('<span class="vs">VS</span>')}</div><div class="center-actions">${btn("進入戰鬥盤 →", "begin-match", "primary")}${btn("重新組隊", "play", "secondary")}</div>`,
  );
}
function beginMatch() {
  match = createMatch(
    teams,
    mode,
    difficulty,
    crypto.getRandomValues(new Uint32Array(1))[0],
  );
  prepareRound();
}
function prepareRound() {
  if (!match) return;
  screen = "launch";
  battle = null;
  replay = null;
  locked = [false, match.mode === "cpu"];
  inputs = [
    { power: 0.9, lane: 1, angle: 10 },
    cpuLaunch(match.difficulty, roundSeed(match)),
  ];
  paused = false;
  processed = false;
  accumulator = 0;
  arena?.setBeys([
    getBey(match.teams[0][match.slot]),
    getBey(match.teams[1][match.slot]),
  ]);
  renderArena();
}
function hud(player: 0 | 1) {
  if (!match) return "";
  const b = getBey(match.teams[player][match.slot]);
  return `<div class="fighter fighter-${player}"><div class="fighter-header"><span>${player === 0 ? "1P" : match.mode === "cpu" ? "CPU" : "2P"}</span>${tag(b)}</div><div class="fighter-identity">${art(b, 42)}<h2>${beyName(b)}<em>${b.code} · ${b.ratchet.startsWith("integrated") ? "一體式" : b.ratchet}${b.bit}</em></h2></div><div class="hud-label">ROTATION <b id="rpm-${player}">100%</b></div><div class="hud-bar"><i id="rpm-bar-${player}" style="width:100%;background:${player === 0 ? "#aee94b" : "#ff845b"}"></i></div><div class="hud-label">爆裂耐久 <b id="burst-${player}">${b.stats.burst}</b></div><div class="hud-bar burst"><i id="burst-bar-${player}" style="width:100%"></i></div><div class="remaining-lineup">${match.teams[player].map((id, i) => `<span class="${match!.slot === i ? "current" : ""}">${i + 1}. ${getBey(id).zhName}</span>`).join("")}</div></div>`;
}
function launchControls(player: 0 | 1) {
  const b = getBey(match!.teams[player][match!.slot]);
  return `<section class="launch-controls panel ${locked[player] ? "locked" : ""}"><div class="launch-heading"><span class="player-chip">${player === 0 ? "1P" : "2P"}</span><h3>${beyName(b)}</h3><span id="lock-status-${player}">${locked[player] ? "發射已鎖定 ✓" : "調整你的發射"}</span></div><div class="launch-options"><div><span class="field-label">落點 <small>${player === 0 ? "A / S / D" : "← / ↓ / →"}</small></span><div class="lane-options">${["內側", "中間", "外側"].map((l, i) => btn(l, "lane", inputs[player].lane === i ? "selected" : "", `data-player="${player}" data-value="${i}" ${locked[player] ? "disabled" : ""}`)).join("")}</div></div><label class="angle-label">傾角 <b id="angle-value-${player}">${inputs[player].angle}°</b><input type="range" min="0" max="30" value="${inputs[player].angle}" data-angle="${player}" aria-label="${player + 1}P 發射傾角" ${locked[player] ? "disabled" : ""}/></label><div class="charge-block"><span class="field-label">蓄力 <small>黃綠區 = 完美發射</small></span><div class="charge-track"><span class="perfect-zone"></span><i id="charge-${player}"></i></div></div>${btn(locked[player] ? `已就緒 ${Math.round(inputs[player].power * 100)}%` : `鎖定發射 <small>${player === 0 ? "SPACE" : "ENTER"}</small>`, "lock", "primary", `data-player="${player}" ${locked[player] ? "disabled" : ""}`)}</div></section>`;
}
function renderArena() {
  const launching = screen === "launch";
  shell(
    `<div class="battle-topline"><div><span class="eyebrow">${screen === "replay" ? "DETERMINISTIC REPLAY" : "3 ON 3 / FIRST TO 4"}</span><h1>${screen === "replay" ? "對戰重播" : `第 ${match!.rounds.length + 1} 場對決`}</h1></div><div class="scoreboard"><span class="p1-score">${match!.scores[0]}</span><span>VS <small>先取 4 分</small></span><span class="p2-score">${match!.scores[1]}</span></div><div class="battle-tools">${btn(document.fullscreenElement ? "退出全螢幕" : "全螢幕", "fullscreen", "secondary")}${btn("近鏡", "close-up", "secondary", `aria-pressed="${arena?.closeUp ?? false}"`)}${btn(speed + "×", "speed", "secondary", 'id="speed-button"')}${btn("暫停", "pause", "secondary", 'id="pause-button"')}${btn(screen === "replay" ? "返回戰績" : "離開對戰", "exit", "text-button")}</div></div><div class="battle-scene">${hud(0)}<div id="stage" class="battle-stage"></div>${hud(1)}<div id="battle-message" class="battle-message" aria-live="polite"></div><div class="arena-bottom-label"><span>OVER <b>+2</b></span><span class="extreme-label">XTREME ZONE <b>+3</b></span><span>OVER <b>+2</b></span></div><div id="pause-overlay" class="pause-overlay" hidden><h2>對戰已暫停</h2>${btn("繼續對戰 →", "pause", "primary")}<p>切換視窗時會自動暫停</p></div></div><div id="battle-controls">${launching ? `<div class="launch-panels">${launchControls(0)}${match!.mode === "local" ? launchControls(1) : `<div class="cpu-ready panel"><span class="eyebrow">CPU READY</span><h3>電腦已就緒</h3><p>${DIFFICULTY[match!.difficulty]} · 等待你的完美發射</p><span class="cpu-pulse"></span></div>`}</div>` : screen === "replay" ? '<div class="replay-note">相同種子、發射輸入與呼喊時機，以固定步長重播。重播不寫入戰績。</div>' : `<div class="shout-controls">${btn("1P 氣勢呼喊 <small>SPACE · 每場一次</small>", "shout", "shout-button", `data-player="0" id="shout-0" ${screen === "countdown" ? "disabled" : ""}`)}${match!.mode === "local" ? btn("2P 氣勢呼喊 <small>ENTER · 每場一次</small>", "shout", "shout-button p2", `data-player="1" id="shout-1" ${screen === "countdown" ? "disabled" : ""}`) : "<p>在接近齒軌時呼喊，兩秒內更容易觸發極限衝刺。</p>"}<span id="battle-time">00.0 秒</span></div>`}</div>`,
  );
  if (screen === "countdown")
    byId("battle-message")!.innerHTML =
      "<strong>3</strong><span>READY TO LAUNCH</span>";
  setPaused(paused);
}
function lock(player: 0 | 1) {
  if (screen !== "launch" || paused || locked[player]) return;
  sound.unlock();
  inputs[player].power = chargePower(player);
  locked[player] = true;
  const host = document.querySelector(
    `.launch-controls:nth-child(${player + 1})`,
  );
  if (host) host.outerHTML = launchControls(player);
  sound.tone(660, 0.08);
  if (locked.every(Boolean)) {
    battle = createBattle(
      getBey(match!.teams[0][match!.slot]),
      getBey(match!.teams[1][match!.slot]),
      inputs,
      roundSeed(match!),
    );
    previousPoses = capturePoses(battle, previousPoses);
    screen = "countdown";
    countdownStart = now;
    renderArena();
    updateHud();
  }
}
function chargePhase(p: number) {
  return 0.5 + 0.5 * Math.sin(now * 0.004 + p * 0.5);
}
function chargePower(p: number) {
  const phase = chargePhase(p);
  return phase >= 0.82 && phase <= 0.94
    ? 1
    : Math.max(0.65, 0.98 - Math.abs(phase - 0.88) * 0.4);
}
function startBattle() {
  screen = "battle";
  processed = false;
  accumulator = 0;
  finishStart = 0;
  renderArena();
  const msg = byId("battle-message")!;
  msg.innerHTML = '<strong class="shoot">GO SHOOT!</strong>';
  setTimeout(() => {
    if (screen === "battle" && !battle?.result) msg.innerHTML = "";
  }, 850);
  sound.tone(440, 0.24, "sawtooth", 0.4, 1000);
}
function roundEnded() {
  if (!battle?.result || !match) return;
  applyRound(match, battle.result, inputs, battle.shouts, battle);
  if (match.winner !== null) {
    recordMatch(profile, match);
    void saveProfile(profile).catch(() => {
      persisted = false;
      toast("無法保存至本機，目前戰績保留在記憶體；請匯出備份。");
    });
    results(match);
    return;
  }
  screen = "round";
  const r = match.rounds.at(-1)!,
    f = FINISH[r.result.finish];
  shell(
    `<section class="round-result panel"><span class="eyebrow">ROUND ${r.index} COMPLETE</span><h1>${r.result.winner === null ? "雙方平手" : f.label}</h1><div class="round-score">${match.scores[0]} <small>:</small> ${match.scores[1]}</div><p>${r.result.winner === null ? "雙方同時終結，保持本場出場順序重打。" : `${r.result.winner === 0 ? "1P" : match.mode === "cpu" ? "CPU" : "2P"} 取得 ${r.result.points} 分 · ${r.result.time.toFixed(1)} 秒`}</p><div class="next-pair">下一場：${beyName(getBey(match.teams[0][match.slot]))}<span>VS</span>${beyName(getBey(match.teams[1][match.slot]))}</div>${btn(r.result.winner === null ? "重新發射 →" : "下一場對決 →", "next-round", "primary")}</section>`,
  );
}
function roundTable(m: Match, playable = false) {
  return `<div class="table-scroll"><table><thead><tr><th>場次</th><th>1P 陀螺</th><th>${m.mode === "cpu" ? "CPU" : "2P"} 陀螺</th><th>勝方 / 終結</th><th>耗時</th>${playable ? "<th>重播</th>" : ""}</tr></thead><tbody>${m.rounds.map((r, i) => `<tr><td>0${r.index}</td><td>${beyName(getBey(r.beys[0]))}</td><td>${beyName(getBey(r.beys[1]))}</td><td>${r.result.winner === null ? "平手" : r.result.winner === 0 ? "1P" : m.mode === "cpu" ? "CPU" : "2P"} · ${FINISH[r.result.finish].label} ${r.result.points ? `+${r.result.points}` : ""}</td><td>${r.result.time.toFixed(1)}s</td>${playable ? `<td>${btn("▶", "replay", "small-button", `data-match="${safe(m.id)}" data-index="${i}" aria-label="重播第${i + 1}場"`)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}
function results(m: Match) {
  screen = "results";
  match = m;
  battle = null;
  const points: Record<string, number> = {};
  for (const r of m.rounds)
    if (r.result.winner !== null) {
      const id = r.beys[r.result.winner];
      points[id] = (points[id] ?? 0) + r.result.points;
    }
  const mvp = Object.entries(points).sort((a, b) => b[1] - a[1])[0];
  shell(
    `<section class="result-hero"><div><div class="eyebrow">MATCH COMPLETE / ${m.mode === "cpu" ? DIFFICULTY[m.difficulty] : "LOCAL VERSUS"}</div><h1>${m.winner === 0 ? "漂亮的一戰。" : m.mode === "local" ? "2P，拿下勝利。" : "再挑戰，突破極限。"}</h1><p>${m.winner === 0 ? "1P 獲勝" : m.mode === "cpu" ? "CPU 獲勝" : "2P 獲勝"} · ${m.rounds.length} 場對決 · ${m.rounds.reduce((n, r) => n + r.result.time, 0).toFixed(1)} 秒</p></div><div class="result-score">${m.scores[0]}<span>:</span>${m.scores[1]}</div></section><div class="result-summary"><div class="panel"><small>1P 本局分數</small><strong>${scoreMatch(m, 0).toLocaleString()}</strong>${m.mode === "local" ? `<small>2P：${scoreMatch(m, 1).toLocaleString()}</small>` : `<small>難度倍率 × ${m.difficulty === "hard" ? 2 : m.difficulty === "normal" ? 1.5 : 1}</small>`}</div><div class="panel mvp">${mvp ? art(getBey(mvp[0]), 85) : ""}<div><span class="eyebrow">MATCH MVP</span><h2>${mvp ? beyName(getBey(mvp[0])) : "—"}</h2><p>取得 ${mvp?.[1] ?? 0} 分</p></div></div><div class="result-buttons">${btn("同隊再戰 ↗", "rematch", "primary")}${btn("重新組隊", "play", "secondary")}${btn("回主選單", "home", "text-button")}</div></div><section class="panel report-panel"><div class="section-index">ROUND BY ROUND <span>逐場明細</span></div>${roundTable(m, true)}</section><section class="panel report-panel"><h2>陀螺表現</h2><div class="table-scroll"><table><thead><tr><th>陀螺</th><th>出戰 / 勝場</th><th>總衝量</th><th>最大衝量</th><th>極限衝刺</th><th>平均剩餘轉速</th></tr></thead><tbody>${[
      ...new Set(m.teams.flat()),
    ]
      .map((id) => {
        const reports = m.rounds.flatMap((r) =>
          r.reports.filter((v) => v.id === id),
        );
        const rounds = m.rounds.filter((r) => r.beys.includes(id));
        const wins = rounds.filter(
          (r) => r.result.winner !== null && r.beys[r.result.winner] === id,
        ).length;
        return `<tr><td>${beyName(getBey(id))}</td><td>${reports.length} / ${wins}</td><td>${reports.reduce((n, r) => n + r.impulse, 0).toFixed(1)}</td><td>${Math.max(0, ...reports.map((r) => r.maxImpulse)).toFixed(1)}</td><td>${reports.reduce((n, r) => n + r.dashes, 0)}</td><td>${reports.length ? Math.round((reports.reduce((n, r) => n + r.rpm, 0) / reports.length) * 100) : 0}%</td></tr>`;
      })
      .join("")}</tbody></table></div></section>`,
  );
}
function stats() {
  screen = "stats";
  battle = null;
  replay = null;
  const c = profile.modes[statsMode][0],
    c2 = profile.modes.local[1];
  const total = Object.values(profile.finishes).reduce((n, v) => n + v, 0);
  shell(
    `${title("YOUR BATTLE RECORD", "每一場，都留下軌跡。", "戰績只保存在此瀏覽器，可匯出 JSON 備份。", `<div class="backup-actions">${btn("匯出 JSON ↓", "export", "secondary")}${btn("匯入備份 ↑", "import", "secondary")}<input type="file" id="backup-file" accept="application/json,.json" hidden/></div>`)}<div class="line-tabs stats-tabs">${btn("單人挑戰", "stats-mode", statsMode === "cpu" ? "selected" : "", 'data-value="cpu"')}${btn("同機對戰", "stats-mode", statsMode === "local" ? "selected" : "", 'data-value="local"')}</div><div class="stats-metrics">${[
      ["對戰場次", c.played, "場"],
      ["1P 勝率", pct(c.wins, c.played), "%"],
      ["1P 勝 / 敗", `${c.wins} / ${c.played - c.wins}`, ""],
      ["最長連勝", c.bestStreak, "場"],
    ]
      .map(
        ([l, v, u]) =>
          `<div class="panel"><small>${l}</small><strong>${v}<span>${u}</span></strong></div>`,
      )
      .join(
        "",
      )}</div>${statsMode === "local" ? `<p class="muted">2P：${c2.wins} 勝 ${c2.played - c2.wins} 敗 · 勝率 ${pct(c2.wins, c2.played)}% · 最長連勝 ${c2.bestStreak}</p>` : ""}<div class="stats-columns"><section class="panel report-panel"><h2>終結分布 <small>全部模式</small></h2>${Object.entries(
      FINISH,
    )
      .map(
        ([k, v]) =>
          `<div class="distribution"><span>${v.label}</span><div><i style="width:${pct(profile.finishes[k as keyof typeof FINISH], total)}%"></i></div><b>${profile.finishes[k as keyof typeof FINISH]}</b><small>${pct(profile.finishes[k as keyof typeof FINISH], total)}%</small></div>`,
      )
      .join(
        "",
      )}</section><section class="panel report-panel"><h2>類型對戰勝率 <small>玩家視角 · 全模式</small></h2><div class="table-scroll"><table class="matrix"><thead><tr><th>我方 ↓ / 對手 →</th>${Object.values(
      TYPE,
    )
      .map((t) => `<th>${t.label}</th>`)
      .join("")}</tr></thead><tbody>${Object.entries(TYPE)
      .map(
        ([a, t]) =>
          `<tr><th>${t.label}</th>${Object.keys(TYPE)
            .map((b) => {
              const p = profile.matrix[`${a}:${b}`];
              return `<td title="${p?.played ?? 0} 次出戰">${p ? `${pct(p.wins, p.played)}%` : "—"}<small>${p?.played ?? 0} 場</small></td>`;
            })
            .join("")}</tr>`,
      )
      .join(
        "",
      )}</tbody></table></div></section></div><section class="panel report-panel"><h2>最近對戰 <small>保留最近 20 局，可展開明細與重播</small></h2>${profile.recent.length ? profile.recent.map((m) => `<details class="history-row" ${historyId === m.id ? "open" : ""}><summary><span class="outcome ${m.winner === 0 ? "win" : ""}">${m.winner === 0 ? "WIN" : "LOSE"}</span><span>${date(m.date)} · ${m.mode === "cpu" ? DIFFICULTY[m.difficulty] + " CPU" : "1P vs 2P"}</span><b>${m.scores[0]} : ${m.scores[1]}</b><span>${m.rounds.length} 場</span><small>查看明細 ＋</small></summary>${roundTable(m, true)}</details>`).join("") : '<div class="empty-state">你的第一場對戰，將從這裡開始。' + btn("前往組隊 →", "play", "primary") + "</div>"}</section><div class="stats-columns"><section class="panel report-panel"><h2>陀螺戰績 <small>所有玩家出戰紀錄</small></h2><div class="table-scroll"><table><thead><tr><th>名稱</th><th>出戰</th><th>勝率</th><th>常見終結</th></tr></thead><tbody>${
      Object.entries(profile.beys)
        .sort((a, b) => b[1].played - a[1].played)
        .map(
          ([id, r]) =>
            `<tr><td>${beyName(getBey(id))}</td><td>${r.played}</td><td>${pct(r.wins, r.played)}%</td><td>${r.wins ? FINISH[Object.entries(r.finishes).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof FINISH].label : "—"}</td></tr>`,
        )
        .join("") || '<tr><td colspan="4">尚無紀錄</td></tr>'
    }</tbody></table></div></section><section class="panel report-panel"><h2>最高分 TOP 10</h2>${profile.highs.map((h, i) => `<div class="highscore"><b>${String(i + 1).padStart(2, "0")}</b><span>${h.team.map((id) => getBey(id).zhName).join(" / ")}<small>${date(h.date)} · ${h.mode === "cpu" ? "單人" : "雙人"}</small></span><strong>${h.score.toLocaleString()}</strong></div>`).join("") || '<p class="empty-state">完成一局，寫下你的紀錄。</p>'}</section></div>`,
  );
}
function showDetail(id: string) {
  const b = getBey(id);
  const reference = modelSpec(b).reference;
  const referencePhotos = [
    ["斜視", reference?.side],
    ["棘輪", reference?.ratchetPhoto],
    ["軸心", reference?.bitPhoto],
  ] as const;
  detailId = id;
  modalReturnBeys = screen === "home" ? [BEYS[0], BEYS[11]] : [];
  const br = profile.beys[id];
  byId("modal-root")!.innerHTML =
    `<div class="modal-backdrop"><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div class="detail-top"><span class="eyebrow">${b.code} / ${b.line} LINE</span>${btn("×", "close-modal", "close-button", 'aria-label="關閉卡牌"')}</div><div class="detail-layout"><div class="detail-visual"><div id="detail-stage"></div><div class="model-tools">${btn("側面", "model-side", "secondary")}${btn("底部", "model-bottom", "secondary")}${btn("三段拆解", "model-explode", "secondary", 'aria-pressed="false"')}</div><span>左右旋轉・上下拖曳看厚度</span></div><div><div>${tag(b)} <span class="spin-label">${b.spin === "L" ? "↶ 左旋" : "↷ 右旋"}</span></div><h2 id="detail-title">${beyName(b)}</h2><p class="name-source">${CHINESE_NAMES[b.id].status === "official-tw" ? "臺灣代理中文名稱" : "中文參考譯名"} · <a href="${CHINESE_NAMES[b.id].source}" target="_blank" rel="noopener">名稱來源 ↗</a></p><p class="detail-feature">${b.feature}</p><div class="part-list"><div><small>戰刃</small><b>${beyName(b)}</b></div><div><small>棘輪</small><b>${b.integrated ? (b.integrated === "blade" ? "與戰刃一體" : "與軸心一體") : b.ratchet}</b></div><div><small>軸心</small><b>${b.bit} · ${bits[b.bit].name}</b></div>${b.line === "CX" ? `<div><small>CX 結構</small><b>${b.cxParts.join(" / ")}</b></div>` : ""}<div><small>發售日</small><b>${b.released ?? "未確認"}${b.released && b.released > new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" }) ? "（預定）" : ""}</b></div></div></div></div><div class="model-references"><a class="reference-photo" href="${reference?.source ?? b.source}" target="_blank" rel="noopener">${art(b, 65)}<small>實際產品參考圖 ↗</small></a>${referencePhotos
      .filter(([, photo]) => photo)
      .map(
        ([label, photo]) =>
          `<a href="${photo!.imageSource}" target="_blank" rel="noopener"><img src="${photo!.src}" alt="${b.name} ${label}原廠參考" loading="lazy"/><span>${label} ↗</span></a>`,
      )
      .join(
        "",
      )}<p>${reference?.confidence === "official-combo" ? `依原廠組合配色${reference.colors.ratchet === null || reference.colors.bit === null ? "（部分下段配色近似）" : ""}` : "配色與外形參考近似"} · 比例依照片近似，非精密零件模型。${b.integrated ? "一體式零件在拆解時保持連接。" : ""}</p></div><div class="detail-bottom">${radar(b)}<div class="stat-numbers">${Object.entries(
      b.stats,
    )
      .map(
        ([k, n]) =>
          `<div><span>${STAT_LABEL[k as keyof Stats]}</span><div><i style="width:${n}%;background:${b.color}"></i></div><b>${n}</b></div>`,
      )
      .join(
        "",
      )}<small>0–100，均為遊戲平衡值，非官方性能或實測重量。</small></div><div class="detail-record"><span class="eyebrow">MATCHUP</span><p>優勢：${TYPE[b.type].strong}<br>留意：${TYPE[b.type].weak}</p><span class="eyebrow">YOUR RECORD</span><p>${br?.played ?? 0} 場出戰 · ${pct(br?.wins ?? 0, br?.played ?? 0)}% 勝率</p><a href="${b.source}" target="_blank" rel="noopener">官方產品資料 ↗</a></div></div></section></div>`;
  arena?.setBeys([b]);
  arena?.attach(byId("detail-stage")!, "inspect");
  document.body.classList.add("modal-open");
  byId("modal-root")!.querySelector<HTMLButtonElement>("button")?.focus();
}
function closeModal() {
  detailId = null;
  byId("modal-root")!.innerHTML = "";
  document.body.classList.remove("modal-open");
  if (modalReturnBeys.length) arena?.setBeys(modalReturnBeys);
  attachStage();
}
function help() {
  byId("modal-root")!.innerHTML =
    `<div class="modal-backdrop"><section class="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">${btn("×", "close-modal", "close-button", 'aria-label="關閉規則"')}<div class="eyebrow">HOW TO PLAY</div><h2 id="help-title">三顆王牌，先搶四分。</h2><ol><li>各選三顆不同戰刃，排定先鋒、中堅、大將。</li><li>設定落點與傾角，在黃綠最佳區鎖定蓄力。1P 用 A / S / D 與空白鍵；2P 用方向鍵與 Enter。</li><li>發射後自動碰撞。每場可呼喊一次，兩秒內提高齒軌衝刺能力。呼喊不補充轉速。</li><li>旋轉終結 1 分、越界與爆裂 2 分、極限終結 3 分。雙方同時終結重打。</li><li>三場後依原順序循環，先得 4 分獲勝。戰績可備份並重播。</li></ol><p>數值是遊戲平衡設定；相性由模擬表現產生。Beyblade 與型號名稱屬原權利人；本作為非官方粉絲作品，產品圖片來自 BeyGear 與 Takara Tomy，3D 側面為近似模型，聲音為原創合成。</p>${btn("準備好了 →", "close-modal", "primary")}</section></div>`;
  document.body.classList.add("modal-open");
  byId("modal-root")!.querySelector<HTMLButtonElement>("button")?.focus();
}
function askExit() {
  if (screen === "replay") {
    screen = "stats";
    replay = null;
    replayMatch = null;
    stats();
    return;
  }
  setPaused(true);
  byId("modal-root")!.innerHTML =
    `<div class="modal-backdrop"><section class="help-modal" role="dialog" aria-modal="true" aria-labelledby="exit-title"><h2 id="exit-title">離開這場對戰？</h2><p>未完成的對戰不會寫入戰績。</p><div class="center-actions">${btn("繼續對戰", "cancel-exit", "primary")}${btn("離開對戰", "confirm-exit", "secondary")}</div></section></div>`;
  document.body.classList.add("modal-open");
  byId("modal-root")!.querySelector<HTMLButtonElement>("button")?.focus();
}
function setPaused(value: boolean) {
  if (value && !paused) pauseStarted = performance.now();
  if (!value && paused) {
    const elapsed = performance.now() - pauseStarted;
    if (screen === "countdown") countdownStart += elapsed;
    if (finishStart) finishStart += elapsed;
    lastFrame = performance.now();
  }
  paused = value;
  const overlay = byId("pause-overlay");
  if (overlay) overlay.hidden = !paused;
  const p = byId("pause-button");
  if (p) p.textContent = paused ? "繼續" : "暫停";
}
function startReplay(id: string, index: number) {
  const m =
    profile.recent.find((m) => m.id === id) ??
    (match?.id === id ? match : null);
  if (!m) return;
  const r = m.rounds[index];
  if (!r) return;
  replay = r;
  replayMatch = m;
  match = { ...m, slot: r.slot };
  historyId = m.id;
  inputs = r.inputs;
  screen = "replay";
  paused = false;
  processed = false;
  finishStart = 0;
  accumulator = 0;
  battle = createBattle(
    getBey(r.beys[0]),
    getBey(r.beys[1]),
    r.inputs,
    r.seed,
    r.engineVersion ?? 1,
  );
  previousPoses = capturePoses(battle);
  arena?.setBeys(r.beys.map(getBey));
  renderArena();
}
app.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-action]",
  );
  if (!target || target.hasAttribute("disabled")) return;
  const a = target.dataset.action;
  const v = target.dataset.value;
  sound.unlock();
  if (
    ["home", "play", "catalog", "stats"].includes(a ?? "") &&
    ["launch", "countdown", "battle"].includes(screen)
  ) {
    askExit();
    return;
  }
  switch (a) {
    case "home":
      home();
      break;
    case "play":
      startTeam();
      break;
    case "catalog":
      catalog();
      break;
    case "stats":
      stats();
      break;
    case "mode":
      mode = v as Mode;
      home();
      break;
    case "difficulty":
      difficulty = v as Difficulty;
      home();
      break;
    case "sound":
      sound.toggle();
      target.textContent = sound.muted ? "音效 關" : "音效 開";
      break;
    case "help":
      if (["battle", "countdown", "launch", "replay"].includes(screen))
        setPaused(true);
      help();
      break;
    case "line":
      filter.line = v!;
      if (screen === "team") renderTeam();
      else catalog();
      break;
    case "detail":
      showDetail(target.dataset.id!);
      break;
    case "model-side":
    case "model-bottom":
      if (arena) arena.pitch = a === "model-side" ? 0.1 : -0.5;
      break;
    case "model-explode":
      if (arena) {
        arena.exploded = !arena.exploded;
        target.setAttribute("aria-pressed", String(arena.exploded));
        target.textContent = arena.exploded ? "組合視圖" : "三段拆解";
        arena.renderer.domElement.dataset.assembly = arena.exploded
          ? "exploded"
          : "assembled";
      }
      break;
    case "close-up":
      if (arena) {
        arena.closeUp = !arena.closeUp;
        target.setAttribute("aria-pressed", String(arena.closeUp));
      }
      break;
    case "fullscreen":
      if (!app.requestFullscreen) {
        toast("此瀏覽器暫不支援全螢幕，已使用放大對戰版面。");
        break;
      }
      (document.fullscreenElement
        ? document.exitFullscreen()
        : app.requestFullscreen()
      ).catch(() => toast("無法切換全螢幕，仍可使用放大對戰版面。"));
      break;
    case "close-modal":
      closeModal();
      break;
    case "quick":
      teams[teamPlayer] = ["attack", "defense", "stamina"].map((t) =>
        BEYS.find((b) => b.type === t)!,
      );
      renderTeam();
      break;
    case "select": {
      const b = getBey(target.dataset.id!),
        t = teams[teamPlayer],
        i = t.findIndex((v) => v.id === b.id);
      if (i >= 0) t.splice(i, 1);
      else if (t.length < 3 && !t.some((v) => v.blade === b.blade)) t.push(b);
      renderTeam();
      break;
    }
    case "move": {
      const i = Number(target.dataset.index),
        j = i + Number(target.dataset.direction),
        t = teams[teamPlayer];
      if (j >= 0 && j < t.length) [t[i], t[j]] = [t[j], t[i]];
      renderTeam();
      break;
    }
    case "confirm-team":
      confirmTeam();
      break;
    case "handoff":
      teamPlayer = 1;
      renderTeam();
      break;
    case "begin-match":
      beginMatch();
      break;
    case "lane": {
      const p = Number(target.dataset.player);
      if (locked[p] || screen !== "launch") break;
      inputs[p].lane = Number(v);
      const group = target.parentElement!;
      group
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("selected"));
      target.classList.add("selected");
      break;
    }
    case "lock":
      lock(Number(target.dataset.player) as 0 | 1);
      break;
    case "shout":
      if (screen === "battle" && !paused && battle) {
        const p = Number(target.dataset.player) as 0 | 1;
        if (shout(battle, p)) {
          arena?.event(battle.events.at(-1)!);
          sound.event(battle.events.at(-1)!);
          target.setAttribute("disabled", "");
          target.innerHTML = "氣勢已使用 ✓";
        }
      }
      break;
    case "pause":
      setPaused(!paused);
      break;
    case "speed":
      speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
      target.textContent = speed + "×";
      break;
    case "next-round":
      prepareRound();
      break;
    case "rematch":
      if (match) {
        teams = match.teams.map((t) => t.map(getBey));
        mode = match.mode;
        difficulty = match.difficulty;
        beginMatch();
      }
      break;
    case "exit":
      askExit();
      break;
    case "cancel-exit":
      closeModal();
      setPaused(false);
      break;
    case "confirm-exit":
      closeModal();
      home();
      break;
    case "stats-mode":
      statsMode = v as Mode;
      stats();
      break;
    case "export": {
      const blob = new Blob([exportProfile(profile)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `spinforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      break;
    }
    case "import":
      (byId("backup-file") as HTMLInputElement).click();
      break;
    case "replay":
      startReplay(target.dataset.match!, Number(target.dataset.index));
      break;
  }
});
app.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "search") {
    filter.query = el.value;
    byId("catalog-list")!.innerHTML = cards();
  }
  if (el.dataset.angle !== undefined) {
    const p = Number(el.dataset.angle);
    if (!locked[p]) {
      inputs[p].angle = Number(el.value);
      byId(`angle-value-${p}`)!.textContent = el.value + "°";
    }
  }
});
app.addEventListener("change", async (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "type-filter" || el.id === "sort") {
    if (el.id === "sort") filter.sort = el.value;
    else filter.type = el.value;
    byId("catalog-list")!.innerHTML = cards();
  }
  if (el.id === "backup-file" && el.files?.[0]) {
    try {
      if (el.files[0].size > 2_000_000) throw new Error("備份檔上限為 2 MB");
      const imported = parseBackup(await el.files[0].text());
      await saveProfile(imported);
      profile = imported;
      persisted = true;
      stats();
      toast("戰績備份已匯入。");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "無法讀取備份，原有戰績未變更。",
      );
    }
    el.value = "";
  }
});
document.addEventListener("keydown", (e) => {
  const modal =
    byId("modal-root")?.querySelector<HTMLElement>('[role="dialog"]');
  if (modal) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
    if (e.key === "Tab") {
      const focus = [
        ...modal.querySelectorAll<HTMLElement>("button,a,input,select"),
      ];
      if (!focus.length) return;
      const first = focus[0],
        last = focus.at(-1)!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if ((e.target as HTMLElement).matches("input,select,textarea") || e.repeat)
    return;
  if (screen === "launch") {
    const mapping: Record<string, [number, number]> = {
      a: [0, 0],
      s: [0, 1],
      d: [0, 2],
      ArrowLeft: [1, 0],
      ArrowDown: [1, 1],
      ArrowRight: [1, 2],
    };
    const m = mapping[e.key];
    if (m && (m[0] === 0 || match?.mode === "local")) {
      e.preventDefault();
      document
        .querySelector<HTMLButtonElement>(
          `[data-action="lane"][data-player="${m[0]}"][data-value="${m[1]}"]`,
        )
        ?.click();
    }
    if (e.code === "Space") {
      e.preventDefault();
      lock(0);
    }
    if (e.key === "Enter" && match?.mode === "local") {
      e.preventDefault();
      lock(1);
    }
  } else if (screen === "battle" && (e.code === "Space" || e.key === "Enter")) {
    e.preventDefault();
    const p = e.code === "Space" ? 0 : 1;
    if (p === 0 || match?.mode === "local") byId(`shout-${p}`)?.click();
  }
  if (
    e.key === "Escape" &&
    ["launch", "battle", "countdown", "replay"].includes(screen)
  )
    setPaused(!paused);
});
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    ["battle", "launch", "countdown", "replay"].includes(screen)
  )
    setPaused(true);
});
document.addEventListener("fullscreenchange", () => {
  const button = document.querySelector('[data-action="fullscreen"]');
  if (button)
    button.textContent = document.fullscreenElement ? "退出全螢幕" : "全螢幕";
});
function updateHud() {
  if (!battle) return;
  battle.tops.forEach((t, p) => {
    const rpm = byId(`rpm-${p}`),
      burst = byId(`burst-${p}`),
      bar = byId(`rpm-bar-${p}`),
      bb = byId(`burst-bar-${p}`);
    if (rpm) rpm.textContent = Math.round(t.rpm * 100) + "%";
    if (burst) burst.textContent = Math.max(0, Math.round(t.burst)).toString();
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, t.rpm))})`;
    if (bb)
      bb.style.transform = `scaleX(${Math.max(0, Math.min(1, t.burst / t.bey.stats.burst))})`;
  });
  const timer = byId("battle-time");
  if (timer) timer.textContent = battle.time.toFixed(1) + " 秒";
}
function frame(time: number) {
  const realDt = Math.max(0, Math.min(0.25, (time - lastFrame) / 1000 || 0));
  lastFrame = time;
  now = time;
  const active = (screen === "battle" || screen === "replay") && !paused;
  if (screen === "launch" && !paused)
    for (const p of [0, 1]) {
      if (!locked[p]) {
        const bar = byId(`charge-${p}`);
        if (bar) bar.style.left = chargePhase(p) * 100 + "%";
      }
    }
  if (screen === "countdown") {
    if (!paused) {
      const remain = 3 - Math.floor((time - countdownStart) / 1000);
      if (remain <= 0) startBattle();
      else {
        const msg = byId("battle-message")!;
        if (msg.dataset.count !== String(remain)) {
          msg.dataset.count = String(remain);
          msg.innerHTML = `<strong>${remain}</strong><span>READY TO LAUNCH</span>`;
          sound.tone(300 + remain * 100, 0.12, "sine", 0.25);
        }
      }
    }
  }
  if (active && battle) {
    if (!battle.result) {
      accumulator += realDt * speed;
      while (accumulator >= DT && !battle.result) {
        if (replay) {
          for (const p of [0, 1] as const)
            if (replay.shouts[p].includes(battle.tick)) shout(battle, p);
        } else if (
          match?.mode === "cpu" &&
          match.difficulty === "hard" &&
          battle.time > 5 &&
          !battle.tops[1].shouted &&
          Math.hypot(battle.tops[1].x, battle.tops[1].z) > 2.5
        )
          shout(battle, 1);
        capturePoses(battle, previousPoses);
        stepBattle(battle);
        for (const event of battle.events) {
          arena?.event(event);
          sound.event(event);
          if (event.type === "dash") {
            const msg = byId("battle-message");
            if (msg) {
              msg.innerHTML = '<span class="dash-message">XTREME DASH</span>';
              setTimeout(() => {
                if (battle && !battle.result && msg.isConnected)
                  msg.innerHTML = "";
              }, 650);
            }
          }
        }
        accumulator -= DT;
      }
      if (battle.result || time - lastHudTime >= 100) {
        updateHud();
        lastHudTime = time;
      }
    }
    if (battle.result && !processed) {
      processed = true;
      finishStart = time;
      arena?.finish(battle);
      const r = battle.result,
        f = FINISH[r.finish];
      byId("battle-message")!.innerHTML =
        `<span class="eyebrow">${r.winner === null ? "DRAW" : r.winner === 0 ? "PLAYER 01" : match?.mode === "cpu" ? "CPU" : "PLAYER 02"}</span><strong class="finish-text">${r.winner === null ? "雙方平手" : f.en}</strong><span>${r.winner === null ? "本場重打" : f.label + " ＋" + r.points}</span>`;
    }
    if (battle.result && processed && time - finishStart > 2300) {
      if (replay) {
        const r = replay;
        const same = JSON.stringify(battle.result) === JSON.stringify(r.result);
        toast(
          same
            ? "重播完成，結果與原對戰一致。"
            : "重播完成；模擬版本可能與原始紀錄不同。",
        );
        replay = null;
        battle = null;
        stats();
      } else roundEnded();
    }
  }
  if ((arena && byId("stage")?.isConnected) || detailId)
    arena?.draw(
      paused ? 0 : realDt,
      detailId
        ? null
        : ["countdown", "battle", "replay"].includes(screen)
          ? battle
          : null,
      previousPoses,
      battle?.result ? 1 : accumulator / DT,
      screen === "countdown"
        ? ((paused ? pauseStarted : time) - countdownStart) / 1000
        : null,
    );
  sound.update(
    battle,
    active && !battle?.result,
    !!match && Math.max(...match.scores) >= 3,
    screen === "home" || screen === "team",
  );
  requestAnimationFrame(frame);
}
home();
requestAnimationFrame(frame);
loadProfile()
  .then((p) => {
    profile = p;
    if (screen === "home") home();
  })
  .catch(() => {
    persisted = false;
    if (screen === "home") home();
    toast("本機儲存暫不可用。仍可遊玩，結束後請匯出戰績備份。");
  });
