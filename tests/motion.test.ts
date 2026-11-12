import { test } from "node:test";
import assert from "node:assert/strict";
import { interpolatePose, spinLean } from "../src/motion.ts";

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
