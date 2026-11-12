import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { closeUpRange, renderPixelRatio } from "../src/arena.ts";

test("高畫素全場限制繪圖像素，圖鑑小畫布與手機保留原清晰度", () => {
  for (const [w, h] of [
    [1406, 790],
    [3840, 2160],
  ]) {
    const ratio = renderPixelRatio(w, h, 2);
    assert.ok(w * h * ratio * ratio <= 2400000 + 0.000001);
    assert.ok(ratio <= 2);
  }
  assert.equal(renderPixelRatio(400, 290, 2), 1.75);
  assert.equal(renderPixelRatio(374, 614, 3, 1.35), 1.35);
  assert.equal(renderPixelRatio(1406, 790, 1), 1);
});

test("開場懸停高度在桌機內圈與手機近鏡都不裁上緣", () => {
  for (const aspect of [0.55, 1.8, 2.4])
    for (const distance of [1.3, 3.5, 6.5]) {
      const camera = new THREE.PerspectiveCamera(39, aspect, 0.1, 100),
        height = 2.2;
      const range = closeUpRange(distance, camera, height);
      camera.position.set(
        Math.sin(0.4) * range,
        3.4 + height * 0.18,
        Math.cos(0.4) * range,
      );
      camera.lookAt(0, 0.2 + height * 0.25, 0);
      camera.updateMatrixWorld();
      for (const sign of [-1, 1])
        for (const y of [0, 0.68])
          for (let i = 0; i < 36; i++) {
            const angle = (i / 36) * Math.PI * 2;
            const point = new THREE.Vector3(
              (sign * distance) / 2 + Math.cos(angle) * 0.55,
              height + y + 0.08,
              Math.sin(angle) * 0.55,
            ).project(camera);
            assert.ok(
              Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
              `${aspect}/${distance}: ${point.toArray()}`,
            );
          }
    }
});

test("手機與寬螢幕近鏡在兩顆最大分離時保留模型外緣", () => {
  for (const aspect of [0.55, 0.93, 2.1])
    for (const distance of [0, 0.4, 4, 8])
      for (const angle of [-1.2, 0, 0.4]) {
        const camera = new THREE.PerspectiveCamera(39, aspect, 0.1, 100),
          range = closeUpRange(distance, camera);
        camera.position.set(
          Math.sin(angle) * range,
          3.4,
          Math.cos(angle) * range,
        );
        camera.lookAt(0, 0.2, 0);
        camera.updateMatrixWorld();
        for (const sign of [-1, 1])
          for (const y of [0, 0.6])
            for (let i = 0; i < 36; i++) {
              const a = (i / 36) * Math.PI * 2;
              const point = new THREE.Vector3(
                (sign * distance) / 2 + Math.cos(a) * 0.55,
                y,
                Math.sin(a) * 0.55,
              ).project(camera);
              assert.ok(
                Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
                `${aspect}/${distance}/${angle}: ${point.toArray()}`,
              );
            }
      }
});
