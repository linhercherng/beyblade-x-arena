import { openDB } from "idb";
import { BEYS, getBey, type BeyType } from "./catalog.ts";
import { FINISH, type Finish } from "./physics.ts";
import { scoreMatch, type Match, type Mode } from "./match.ts";

export interface RecordCount {
  played: number;
  wins: number;
  streak: number;
  bestStreak: number;
}
export interface BeyRecord {
  played: number;
  wins: number;
  finishes: Record<Finish, number>;
}
export interface Profile {
  version: 1;
  modes: Record<Mode, RecordCount[]>;
  beys: Record<string, BeyRecord>;
  finishes: Record<Finish, number>;
  matrix: Record<string, { played: number; wins: number }>;
  recent: Match[];
  highs: {
    id: string;
    date: string;
    score: number;
    team: string[];
    mode: Mode;
  }[];
}
const count = (): RecordCount => ({
  played: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0,
});
const finishes = (): Record<Finish, number> => ({
  spin: 0,
  over: 0,
  burst: 0,
  extreme: 0,
});
export const freshProfile = (): Profile => ({
  version: 1,
  modes: { cpu: [count(), count()], local: [count(), count()] },
  beys: {},
  finishes: finishes(),
  matrix: {},
  recent: [],
  highs: [],
});
let db: ReturnType<typeof openDB> | null = null;
function database() {
  return (db ??= openDB("spinforge-x-arena", 1, {
    upgrade(db) {
      db.createObjectStore("profile");
    },
  }));
}
export async function loadProfile(): Promise<Profile> {
  const data = await (await database()).get("profile", "main");
  return data ? validateProfile(data) : freshProfile();
}
export async function saveProfile(profile: Profile) {
  await (await database()).put("profile", profile, "main");
}
export function recordMatch(profile: Profile, match: Match) {
  if (match.winner === null) throw new Error("未結束的對戰不可寫入戰績");
  if (profile.recent.some((m) => m.id === match.id)) return;
  const players = match.mode === "cpu" ? [0] : [0, 1];
  for (const player of players) {
    const c = profile.modes[match.mode][player];
    c.played++;
    if (match.winner === player) {
      c.wins++;
      c.streak++;
      c.bestStreak = Math.max(c.bestStreak, c.streak);
    } else c.streak = 0;
    profile.highs.push({
      id: match.id + "-" + player,
      date: match.date,
      score: scoreMatch(match, player as 0 | 1),
      team: match.teams[player],
      mode: match.mode,
    });
  }
  for (const r of match.rounds) {
    if (r.result.winner !== null) profile.finishes[r.result.finish]++;
    for (const player of players) {
      const id = r.beys[player],
        opponent = r.beys[1 - player];
      const br = (profile.beys[id] ??= {
        played: 0,
        wins: 0,
        finishes: finishes(),
      });
      br.played++;
      const key = `${getBey(id).type}:${getBey(opponent).type}`;
      const pair = (profile.matrix[key] ??= { played: 0, wins: 0 });
      pair.played++;
      if (r.result.winner === player) {
        br.wins++;
        br.finishes[r.result.finish]++;
        pair.wins++;
      }
    }
  }
  profile.highs.sort((a, b) => b.score - a.score);
  profile.highs = profile.highs.slice(0, 10);
  profile.recent.unshift(structuredClone(match));
  profile.recent = profile.recent.slice(0, 20);
}
export function playerHabit(profile: Profile): BeyType[] | undefined {
  const past = profile.recent.filter((m) => m.mode === "cpu").slice(0, 10);
  if (!past.length) return;
  return [0, 1, 2].map((slot) => {
    const votes: Record<string, number> = {};
    for (const m of past) {
      const type = getBey(m.teams[0][slot]).type;
      votes[type] = (votes[type] ?? 0) + 1;
    }
    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0] as BeyType;
  });
}
const isObject = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (n: unknown, max = 1e10) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
const integer = (n: unknown, max = 1e10) => num(n, max) && Number.isInteger(n);
const ids = new Set(BEYS.map((b) => b.id));
const team = (v: unknown) =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((id) => typeof id === "string" && ids.has(id)) &&
  new Set(v.map((id) => getBey(id).blade)).size === 3;
function validCount(v: unknown) {
  return (
    isObject(v) && integer(v.played) && integer(v.wins) && v.wins <= v.played
  );
}
function validFinishes(v: unknown) {
  return (
    isObject(v) &&
    Object.keys(v).length === 4 &&
    Object.keys(FINISH).every((k) => integer(v[k]))
  );
}
function validDate(d: unknown) {
  return (
    typeof d === "string" && d.length < 40 && Number.isFinite(Date.parse(d))
  );
}
export function validateMatch(v: unknown): Match {
  const fail = () => {
    throw new Error("對戰資料不完整或格式不正確");
  };
  if (!isObject(v)) return fail();
  if (
    typeof v.id !== "string" ||
    v.id.length > 100 ||
    !validDate(v.date) ||
    !["cpu", "local"].includes(v.mode) ||
    !["easy", "normal", "hard"].includes(v.difficulty) ||
    !integer(v.seed, 0xffffffff) ||
    !Array.isArray(v.teams) ||
    v.teams.length !== 2 ||
    !v.teams.every(team) ||
    !Array.isArray(v.scores) ||
    v.scores.length !== 2 ||
    !v.scores.every((n: unknown) => integer(n, 6)) ||
    ![0, 1].includes(v.winner) ||
    !Array.isArray(v.rounds) ||
    v.rounds.length === 0 ||
    v.rounds.length > 200
  )
    return fail();
  const scores = [0, 0];
  let slot = 0;
  for (const [index, r] of v.rounds.entries()) {
    if (
      !isObject(r) ||
      (r.engineVersion !== undefined &&
        r.engineVersion !== 1 &&
        r.engineVersion !== 2 &&
        r.engineVersion !== 3 &&
        r.engineVersion !== 4) ||
      r.index !== index + 1 ||
      r.slot !== slot ||
      !integer(r.seed, 0xffffffff) ||
      !Array.isArray(r.beys) ||
      r.beys.length !== 2 ||
      r.beys.some((id: unknown, p: number) => id !== v.teams[p][slot]) ||
      !Array.isArray(r.inputs) ||
      r.inputs.length !== 2 ||
      !r.inputs.every(
        (i: unknown) =>
          isObject(i) &&
          num(i.power, 1) &&
          i.power >= 0.4 &&
          integer(i.lane, 2) &&
          num(i.angle, 30),
      ) ||
      !isObject(r.result) ||
      !Object.hasOwn(FINISH, r.result.finish) ||
      ![null, 0, 1].includes(r.result.winner) ||
      !num(r.result.time, 120) ||
      r.result.points !==
        (r.result.winner === null
          ? 0
          : FINISH[r.result.finish as Finish].points) ||
      !Array.isArray(r.shouts) ||
      r.shouts.length !== 2 ||
      !r.shouts.every(
        (a: unknown) =>
          Array.isArray(a) &&
          a.length <= 1 &&
          a.every((tick: unknown) =>
            integer(tick, Math.ceil(r.result.time * 120)),
          ),
      ) ||
      !Array.isArray(r.reports) ||
      r.reports.length !== 2 ||
      r.reports.some(
        (p: unknown, i: number) =>
          !isObject(p) ||
          p.id !== r.beys[i] ||
          !num(p.impulse) ||
          !num(p.maxImpulse) ||
          !integer(p.dashes, 1000) ||
          !num(p.rpm, 1),
      )
    )
      return fail();
    if (r.result.winner !== null) {
      scores[r.result.winner] += r.result.points;
      slot = (slot + 1) % 3;
    }
    if (Math.max(...scores) >= 4 && index !== v.rounds.length - 1)
      return fail();
  }
  if (
    scores.some((s, i) => s !== v.scores[i]) ||
    scores[v.winner] < 4 ||
    scores[1 - v.winner] >= 4
  )
    return fail();
  return structuredClone(v) as Match;
}
export function validateProfile(v: unknown): Profile {
  const fail = () => {
    throw new Error(
      "備份格式無效，原有戰績未變更。請選擇本遊戲匯出的 JSON 檔。",
    );
  };
  if (
    !isObject(v) ||
    v.version !== 1 ||
    !isObject(v.modes) ||
    !isObject(v.beys) ||
    !validFinishes(v.finishes) ||
    !isObject(v.matrix) ||
    !Array.isArray(v.recent) ||
    v.recent.length > 20 ||
    !Array.isArray(v.highs) ||
    v.highs.length > 10
  )
    return fail();
  for (const mode of ["cpu", "local"])
    if (
      !Array.isArray(v.modes[mode]) ||
      v.modes[mode].length !== 2 ||
      !v.modes[mode].every(
        (c: unknown) =>
          validCount(c) &&
          isObject(c) &&
          integer(c.streak) &&
          integer(c.bestStreak) &&
          c.streak <= c.bestStreak &&
          c.bestStreak <= c.wins,
      )
    )
      return fail();
  for (const [id, b] of Object.entries(v.beys))
    if (
      !ids.has(id) ||
      !validCount(b) ||
      !isObject(b) ||
      !validFinishes(b.finishes)
    )
      return fail();
  const types = ["attack", "defense", "stamina", "balance"];
  for (const [key, c] of Object.entries(v.matrix))
    if (
      !types.some((a) => types.some((b) => key === `${a}:${b}`)) ||
      !validCount(c)
    )
      return fail();
  v.recent.forEach(validateMatch);
  if (new Set(v.recent.map((m: any) => m.id)).size !== v.recent.length)
    return fail();
  for (const h of v.highs)
    if (
      !isObject(h) ||
      typeof h.id !== "string" ||
      h.id.length > 110 ||
      !validDate(h.date) ||
      !num(h.score, 1e7) ||
      !team(h.team) ||
      !["cpu", "local"].includes(h.mode)
    )
      return fail();
  // 僅保留已驗證的頂層欄位，拒絕將額外鍵合併進應用程式狀態。
  return structuredClone({
    version: 1,
    modes: v.modes,
    beys: v.beys,
    finishes: v.finishes,
    matrix: v.matrix,
    recent: v.recent,
    highs: v.highs,
  }) as Profile;
}
export function exportProfile(profile: Profile) {
  return JSON.stringify(profile, null, 2);
}
export function parseBackup(text: string) {
  if (text.length > 2_000_000) throw new Error("備份檔上限為 2 MB");
  return validateProfile(JSON.parse(text));
}
