import { test } from "node:test";
import assert from "node:assert/strict";
import { getBey, BEYS } from "../src/catalog.ts";
import { createBattle, stepBattle, shout, DT } from "../src/physics.ts";

const inputs = [
  { power: .6767411596607417, lane: 1, angle: 15 },
  { power: .9601050117402338, lane: 0, angle: 8 },
];
function tyranno(version?: 1 | 2) {
  const s = createBattle(getBey("ux-15-tyranno-roar"), getBey("bx-31-tyranno-beat"), inputs, 72101967, version);
  while (!s.result && s.time < 41) {
    if (s.tick === 720) shout(s, 0);
    if (s.tick === 840) shout(s, 1);
    stepBattle(s);
  }
  return s;
}
test("14.43秒爆裂個案新對戰至少15秒，v2重播保持原結果", () => {
  const current = tyranno();
  assert.ok(current.result && current.time >= 15 && current.time <= 40, JSON.stringify(current.result));
  assert.deepEqual(tyranno().result, current.result);
  assert.deepEqual(tyranno(2).result, { winner: 1, finish: "burst", points: 2, time: 14.433333333333334 });
});
test("開場保護同時涵蓋耗盡、爆裂與碰撞推出盤外，不留下已終結的視覺狀態", () => {
  const s = createBattle(BEYS[0], BEYS[1], inputs, 1);
  s.tick = 1798; s.time = s.tick * DT;
  Object.assign(s.tops[0], { x: 4.5, z: 0, vx: 7, vz: 0, rpm: 0, burst: -1 });
  stepBattle(s);
  assert.equal(s.result, null);
  assert.ok(s.tops[0].rpm > 0 && s.tops[0].burst > 0);
  assert.ok(Math.hypot(s.tops[0].x, s.tops[0].z) < 4.25);
  s.tops[0].burst = 0;
  stepBattle(s);
  assert.equal(s.result?.time, 15);
  assert.equal(s.result?.finish, "burst");
});
test("末段耗轉保留能量差與左右旋交換，滿轉速也在40秒內自然終結", () => {
  for (const opposite of [false, true]) {
    const a = getBey("ux-03-wizard-rod");
    const b = { ...a, spin: opposite ? "L" as const : a.spin };
    const s = createBattle(a, b, [{ power: 1, lane: 0, angle: 0 }, { power: 1, lane: 0, angle: 0 }], 3);
    s.tick = 30 / DT; s.time = 30;
    s.tops[1].rpm = .9;
    while (!s.result && s.time <= 40) stepBattle(s);
    assert.ok(s.result && s.time <= 40, `${opposite}: ${s.time}`);
    assert.equal(s.result.finish, "spin");
    assert.equal(s.result.winner, 0);
  }
});
