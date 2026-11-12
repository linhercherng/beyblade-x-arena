import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpolatePose,
  spinLean,
  entryPose,
  damping,
  capturePoses,
} from "../src/motion.ts";
import { createBattle } from "../src/physics.ts";
import { BEYS } from "../src/catalog.ts";

test("降下開場先懸停再加速落盤、輕彈，最後精確接上開局角度與角速度", () => {
  assert.equal(entryPose(0, 30).phase, "hover");
  assert.equal(entryPose(1.8, 30).height, 2.2);
  assert.ok(entryPose(2, 30).height > entryPose(2.3, 30).height);
  assert.ok(entryPose(2.55, 30).height > 0);
  for (let t = 0; t < 3.1; t += 0.001) assert.ok(entryPose(t, 30).height >= 0);
  for (const omega of [-30, 30]) {
    assert.equal(entryPose(3, omega).height, 0);
    assert.equal(entryPose(3, omega).rotation, 0);
    assert.ok(
      Math.abs(
        (entryPose(3, omega).rotation - entryPose(2.999, omega).rotation) /
          0.001 -
          omega,
      ) < 1e-7,
    );
  }
  assert.equal(entryPose(2.1, 30, true).height, 0);
  assert.equal(entryPose(2.1, 30, true).rotation, 0);
  assert.equal(entryPose(2.1, 30, true).pulse, 0);
});
test("鏡頭與傾斜阻尼在30/60/144Hz下同樣收斂，暫停步長為零", () => {
  const values = [30, 60, 144].map((fps) => {
    let value = 0;
    for (let i = 0; i < fps; i++) value += (1 - value) * damping(1 / fps, 8);
    return value;
  });
  assert.ok(Math.max(...values) - Math.min(...values) < 1e-12);
  assert.equal(damping(0, 8), 0);
});
test("物理快照可重用物件，且不會修改物理本體或下一步狀態", () => {
  const battle = createBattle(
    BEYS[0],
    BEYS[1],
    [
      { power: 0.9, lane: 1, angle: 0 },
      { power: 0.9, lane: 1, angle: 0 },
    ],
    1,
  );
  const snapshots = capturePoses(battle),
    first = snapshots[0];
  battle.tops[0].rotation = 12;
  assert.equal(first.rotation, 0);
  assert.equal(capturePoses(battle, snapshots), snapshots);
  assert.equal(snapshots[0], first);
  assert.equal(first.rotation, 12);
  first.rotation = 99;
  assert.equal(battle.tops[0].rotation, 12);
});

const pose = (rotation: number) => ({
  x: 2,
  z: -1,
  rotation,
  rpm: 0.1,
  tilt: 0.7,
});
test("低速旋轉在144Hz繪圖及120Hz物理之間持續前進，不隔幀停頓", () => {
  let previous = pose(0),
    current = pose(0),
    accumulator = 0,
    last = 0;
  const increments: number[] = [];
  for (let frame = 0; frame < 144; frame++) {
    accumulator += 1 / 144;
    while (accumulator >= 1 / 120) {
      previous = { ...current };
      current.rotation += 3.25 / 120;
      accumulator -= 1 / 120;
    }
    const rendered = interpolatePose(previous, current, accumulator * 120);
    if (frame > 2) increments.push(rendered.rotation - last);
    last = rendered.rotation;
  }
  assert.ok(increments.every((d) => d > 0));
  assert.ok(Math.max(...increments) - Math.min(...increments) < 1e-10);
});
test("插值保留左右旋的連續圈數，且不修改物理狀態", () => {
  for (const sign of [-1, 1]) {
    const previous = pose(sign * 6.27),
      current = pose(sign * 6.3),
      before = JSON.stringify(current);
    const mid = interpolatePose(previous, current, 0.5);
    assert.ok(Math.abs(mid.rotation - sign * 6.285) < 1e-10);
    assert.equal(JSON.stringify(current), before);
  }
});
test("低速進動依旋轉相位緩移，停止及暫停時不自行高頻抖動", () => {
  const a = spinLean(0.8, 2, 0),
    b = spinLean(0.8, 2 + 3.25 / 144, 0);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.002);
  assert.deepEqual(spinLean(0.8, 2, 0), a);
  assert.deepEqual(spinLean(0, 15, 1), { x: 0, z: 0 });
});
