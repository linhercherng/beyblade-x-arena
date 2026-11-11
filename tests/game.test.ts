import { test } from "node:test";
import assert from "node:assert/strict";
import { BEYS, bits, getBey } from "../src/catalog.ts";
import {
  createBattle,
  stepBattle,
  DT,
  finishFor,
  shout,
} from "../src/physics.ts";
import {
  selectCpu,
  applyRound,
  createMatch,
  scoreMatch,
} from "../src/match.ts";
test("輕擦護牆只依實際法向衝量耗轉，不按每個tick扣固定轉速", () => {
  const s = createBattle(
    BEYS[0],
    BEYS[1],
    [
      { power: 0.95, lane: 1, angle: 0 },
      { power: 0.95, lane: 1, angle: 0 },
    ],
    1,
  );
  const t = s.tops[0];
  for (let n = 0; n < 120; n++) {
    t.x = 3;
    t.z = 3;
    t.vx = 0.01;
    t.vz = 0.01;
    t.hitUntil = 100;
    stepBattle(s);
  }
  assert.ok(t.rpm > 0.9, `輕擦一秒後轉速 ${t.rpm}`);
});
test("新引擎仍能依物理狀態產生越界、極限及爆裂終結", () => {
  const launches = [
    { power: 0.95, lane: 1, angle: 0 },
    { power: 0.95, lane: 1, angle: 0 },
  ];
  for (const finish of ["over", "extreme"] as const) {
    const s = createBattle(BEYS[0], BEYS[1], launches, 2),
      t = s.tops[0];
    Object.assign(s.tops[1], { x: -1, z: -1 });
    Object.assign(t, {
      x: finish === "over" ? 4.12 : 0,
      z: finish === "over" ? 0 : 4.12,
      vx: finish === "over" ? 7 : 0,
      vz: finish === "over" ? 0 : 7,
      rpm: 0.05,
      hitUntil: 100,
    });
    for (let i = 0; i < 30 && !s.result; i++) stepBattle(s);
    assert.equal(s.result?.finish, finish);
    assert.equal(s.result?.winner, 1);
  }
  const s = createBattle(BEYS[0], BEYS[1], launches, 2);
  Object.assign(s.tops[0], {
    x: -0.3,
    z: 0,
    vx: 5,
    vz: 0,
    rpm: 0.1,
    burst: 0.01,
  });
  Object.assign(s.tops[1], { x: 0.3, z: 0, vx: -5, vz: 0, rpm: 0.1 });
  stepBattle(s);
  assert.equal(s.result?.finish, "burst");
});

test("企劃書完整 83 顆，型號重複仍有獨立 ID，零件合成數值有效", () => {
  assert.equal(BEYS.length, 83);
  assert.equal(new Set(BEYS.map((b) => b.id)).size, 83);
  assert.deepEqual(
    ["BX", "UX", "CX"].map((l) => BEYS.filter((b) => b.line === l).length),
    [32, 24, 27],
  );
  for (const b of BEYS) {
    assert.ok(bits[b.bit]);
    for (const n of Object.values(b.stats)) assert.ok(n > 0 && n <= 100);
    assert.ok(b.blade && b.ratchet && b.feature && b.type);
  }
});

const inputs = [
  { power: 0.97, lane: 1, angle: 12 },
  { power: 0.89, lane: 2, angle: 5 },
] as const;
const run = (seed: number) => {
  const s = createBattle(
    getBey("bx-01-dran-sword"),
    getBey("ux-03-wizard-rod"),
    inputs,
    seed,
  );
  for (let i = 0; i < 120 * 60 && !s.result; i++) stepBattle(s);
  return s;
};
test("相同輸入與種子重播完全一致，物理自行終結", () => {
  const a = run(42),
    b = run(42);
  assert.ok(a.result);
  assert.deepEqual(a, b);
  assert.ok(a.time < 60);
});
test("四種終結與同時終結依狀態判定，非抽籤", () => {
  assert.equal(finishFor({ rpm: 0, burst: 40, x: 0, z: 0 }), "spin");
  assert.equal(finishFor({ rpm: 1, burst: 0, x: 0, z: 0 }), "burst");
  assert.equal(finishFor({ rpm: 1, burst: 40, x: 5, z: 0 }), "over");
  assert.equal(finishFor({ rpm: 1, burst: 40, x: 0, z: 5 }), "extreme");
  const s = createBattle(BEYS[0], BEYS[1], inputs, 1);
  s.tops.forEach((t) => (t.rpm = 0));
  stepBattle(s);
  assert.equal(s.result?.winner, null);
});
test("氣勢只能使用一次，持續兩秒，不直接改變轉速", () => {
  const s = createBattle(BEYS[0], BEYS[1], inputs, 1);
  const rpm = s.tops[0].rpm;
  assert.equal(shout(s, 0), true);
  assert.equal(shout(s, 0), false);
  assert.equal(s.tops[0].rpm, rpm);
  assert.equal(s.tops[0].boostUntil, 2);
  assert.equal(DT, 1 / 120);
});
test("3on3 依順序循環，搶4分，同分重打不前進", () => {
  const m = createMatch(
    [BEYS.slice(0, 3), BEYS.slice(3, 6)],
    "cpu",
    "normal",
    1,
  );
  const result = (winner: 0 | 1 | null, finish: "spin" | "extreme") => ({
    winner,
    finish,
    points: finish === "spin" ? 1 : 3,
    time: 20,
  });
  applyRound(m, result(null, "spin"), inputs, [[], []], null);
  assert.equal(m.slot, 0);
  applyRound(m, result(0, "extreme"), inputs, [[], []], null);
  assert.equal(m.slot, 1);
  assert.equal(m.winner, null);
  applyRound(m, result(0, "spin"), inputs, [[], []], null);
  assert.equal(m.winner, 0);
  assert.deepEqual(m.scores, [4, 0]);
  assert.ok(scoreMatch(m, 0) >= 1000 + 800 + 300 + 500);
});
test("三級電腦皆三顆不重複戰刃，普通選互補類型", () => {
  for (const d of ["easy", "normal", "hard"] as const) {
    const team = selectCpu(d, 42, BEYS.slice(0, 3));
    assert.equal(team.length, 3);
    assert.equal(new Set(team.map((b) => b.blade)).size, 3);
    if (d === "normal") assert.equal(new Set(team.map((b) => b.type)).size, 3);
  }
});
