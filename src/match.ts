import { BEYS, type Bey, type BeyType } from "./catalog.ts";
import { rng, ENGINE_VERSION, type Launch, type Result, type Battle } from "./physics.ts";
export type Difficulty = "easy" | "normal" | "hard";
export type Mode = "cpu" | "local";
export const DIFFICULTY = { easy: "初級", normal: "中級", hard: "高級" };
export interface TopReport {
  id: string;
  impulse: number;
  maxImpulse: number;
  dashes: number;
  rpm: number;
}
export interface Round {
  engineVersion?: 1 | 2 | 3 | 4;
  index: number;
  slot: number;
  seed: number;
  beys: [string, string];
  inputs: Launch[];
  shouts: number[][];
  result: Result;
  reports: TopReport[];
}
export interface Match {
  id: string;
  date: string;
  mode: Mode;
  difficulty: Difficulty;
  teams: [string[], string[]];
  scores: [number, number];
  slot: number;
  rounds: Round[];
  winner: 0 | 1 | null;
  seed: number;
}
export function createMatch(
  teams: Bey[][],
  mode: Mode,
  difficulty: Difficulty,
  seed: number,
): Match {
  if (
    teams.length !== 2 ||
    teams.some(
      (t) => t.length !== 3 || new Set(t.map((b) => b.blade)).size !== 3,
    )
  )
    throw new Error("每隊需三顆不同戰刃");
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    mode,
    difficulty,
    teams: teams.map((t) => t.map((b) => b.id)) as [string[], string[]],
    scores: [0, 0],
    slot: 0,
    rounds: [],
    winner: null,
    seed,
  };
}
export function roundSeed(m: Match) {
  return (m.seed + Math.imul(m.rounds.length + 1, 7919)) >>> 0;
}
export function applyRound(
  m: Match,
  result: Result,
  inputs: readonly Launch[],
  shouts: number[][],
  battle: Battle | null,
) {
  if (m.winner !== null) throw new Error("此局已結束");
  const beys = [m.teams[0][m.slot], m.teams[1][m.slot]] as [string, string];
  m.rounds.push({
    engineVersion: battle?.version ?? ENGINE_VERSION,
    index: m.rounds.length + 1,
    slot: m.slot,
    seed: roundSeed(m),
    beys,
    inputs: inputs.map((i) => ({ ...i })),
    shouts: shouts.map((s) => [...s]),
    result: { ...result },
    reports: battle
      ? battle.tops.map((t) => ({
          id: t.bey.id,
          impulse: t.impulse,
          maxImpulse: t.maxImpulse,
          dashes: t.dashes,
          rpm: t.rpm,
        }))
      : [],
  });
  if (result.winner === null) return;
  m.scores[result.winner] += result.points;
  if (m.scores[result.winner] >= 4) m.winner = result.winner;
  else m.slot = (m.slot + 1) % 3;
}
export function selectCpu(
  difficulty: Difficulty,
  seed: number,
  player: Bey[],
  habit?: BeyType[],
): Bey[] {
  const random = rng(seed),
    pool = [...BEYS];
  const shuffled = pool
    .map((b) => ({ b, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map((v) => v.b);
  if (difficulty === "easy") return shuffled.slice(0, 3);
  const order: BeyType[] =
    difficulty === "hard"
      ? (habit ?? player.map((b) => b.type)).map((t) =>
          t === "attack"
            ? "defense"
            : t === "defense"
              ? "stamina"
              : t === "stamina"
                ? "attack"
                : "balance",
        )
      : ["attack", "defense", "stamina"];
  const selected: Bey[] = [];
  for (const type of order) {
    const options = shuffled.filter(
      (b) => b.type === type && !selected.some((p) => p.blade === b.blade),
    );
    if (difficulty === "hard")
      options.sort(
        (a, b) =>
          Object.values(b.stats).reduce((n, v) => n + v, 0) -
          Object.values(a.stats).reduce((n, v) => n + v, 0),
      );
    selected.push(options[0]);
  }
  return selected;
}
export function cpuLaunch(difficulty: Difficulty, seed: number): Launch {
  const random = rng(seed),
    range = { easy: [0.7, 0.9], normal: [0.85, 0.97], hard: [0.95, 1] }[
      difficulty
    ];
  return {
    power: range[0] + random() * (range[1] - range[0]),
    lane: Math.floor(random() * 3),
    angle: Math.round(random() * 25),
  };
}
export function scoreMatch(m: Match, player: 0 | 1) {
  let score = m.winner === player ? 1000 : 0;
  score += m.scores[player] * 200;
  score += m.rounds.reduce(
    (n, r) =>
      n +
      (r.result.winner === player
        ? r.result.finish === "extreme"
          ? 300
          : r.result.finish === "spin"
            ? 0
            : 200
        : 0) +
      (r.inputs[player].power >= 0.95 ? 50 : 0),
    0,
  );
  if (m.winner === player && m.scores[1 - player] === 0) score += 500;
  return Math.round(
    score *
      (m.mode === "cpu" ? { easy: 1, normal: 1.5, hard: 2 }[m.difficulty] : 1),
  );
}
