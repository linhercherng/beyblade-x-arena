import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { closeUpRange } from "../src/arena.ts";

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
