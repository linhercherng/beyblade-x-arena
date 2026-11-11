import { test } from "node:test";
import assert from "node:assert/strict";
import { BEYS } from "../src/catalog.ts";
import { createBattle, stepBattle, shout } from "../src/physics.ts";
import { createMatch, applyRound, roundSeed } from "../src/match.ts";
import {
  freshProfile,
  recordMatch,
  validateProfile,
  parseBackup,
  exportProfile,
} from "../src/storage.ts";

const launches = [
  { power: 0.97, lane: 1, angle: 12 },
  { power: 0.92, lane: 0, angle: 4 },
];
function complete(mode: "cpu" | "local" = "cpu") {
  const teams = [BEYS.slice(0, 3), BEYS.slice(3, 6)];
  const m = createMatch(teams, mode, "hard", 123);
  while (m.winner === null) {
    const s = createBattle(
      teams[0][m.slot],
      teams[1][m.slot],
      launches,
      roundSeed(m),
    );
    while (!s.result) {
      if (s.tick === 120) shout(s, 0);
      stepBattle(s);
    }
    applyRound(m, s.result, launches, s.shouts, s);
    assert.ok(m.rounds.length < 30);
  }
  return m;
}
test("真實完整賽事可保存、匯出、匯入並保持資料，重複結算不重複記分", () => {
  const p = freshProfile(),
    m = complete();
  recordMatch(p, m);
  recordMatch(p, m);
  assert.equal(p.modes.cpu[0].played, 1);
  assert.equal(p.modes.cpu[1].played, 0);
  assert.equal(p.recent.length, 1);
  assert.equal(p.highs.length, 1);
  assert.deepEqual(parseBackup(exportProfile(p)), p);
});
test("雙人分開記錄勝負，最高分與最近20局有上限", () => {
  const p = freshProfile(),
    m = complete("local");
  for (let i = 0; i < 25; i++) recordMatch(p, { ...m, id: String(i) });
  assert.deepEqual(
    p.modes.local.map((c) => c.played),
    [25, 25],
  );
  assert.equal(p.modes.local[m.winner!].wins, 25);
  assert.equal(p.modes.local[m.winner!].bestStreak, 25);
  assert.equal(p.highs.length, 10);
  assert.equal(p.recent.length, 20);
  assert.doesNotThrow(() => validateProfile(p));
});
test("拒絕惡意或損毀備份，驗證不修改既有狀態", () => {
  const p = freshProfile(),
    m = complete();
  recordMatch(p, m);
  assert.throws(() => parseBackup('{"version":1}'));
  assert.throws(() => parseBackup(" ".repeat(2_000_001)));
  const b = structuredClone(p);
  b.recent[0].teams[0][0] = "<script>";
  assert.throws(() => validateProfile(b));
  const c = structuredClone(p);
  c.recent[0].scores = [0, 0];
  assert.throws(() => validateProfile(c));
  const d = structuredClone(p);
  d.recent[0].rounds[0].inputs = [];
  assert.throws(() => validateProfile(d));
  assert.equal(p.recent[0].teams[0][0], m.teams[0][0]);
});
test("保存的發射與呼喊可逐步重播，每場結果完全一致", () => {
  for (const r of complete().rounds) {
    const s = createBattle(
      BEYS.find((b) => b.id === r.beys[0])!,
      BEYS.find((b) => b.id === r.beys[1])!,
      r.inputs,
      r.seed,
    );
    while (!s.result) {
      for (const p of [0, 1] as const)
        if (r.shouts[p].includes(s.tick)) shout(s, p);
      stepBattle(s);
    }
    assert.deepEqual(s.result, r.result);
  }
});
