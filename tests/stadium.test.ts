import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createStadium } from "../src/stadium.ts";

test("盤面曲率符合現有落點，三個出口保持可穿過的護牆開口", () => {
  const model = createStadium();
  model.updateMatrixWorld(true);
  const bowl = model.getObjectByName("bowl-surface")!;
  for (const r of [0.2, 1, 2, 3.8]) {
    const hit = new THREE.Raycaster(
      new THREE.Vector3(r, 2, 0),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(bowl)[0];
    assert.ok(hit);
    assert.ok(
      Math.abs(hit.point.y - (r * r * 0.024 - 0.03)) < 0.002,
      String(r),
    );
  }
  for (const direction of [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
  ]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 0.75, 0),
      direction,
      4,
      5.3,
    );
    assert.equal(
      ray.intersectObject(model.getObjectByName("guard-panels")!).length,
      0,
    );
    assert.equal(
      ray.intersectObject(model.getObjectByName("guard-posts")!).length,
      0,
    );
  }
  for (const z of [-0.99, 0.99])
    for (const side of [-1, 1]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(0, 0.75, z),
        new THREE.Vector3(side, 0, 0),
        4,
        5.3,
      );
      assert.equal(
        ray.intersectObject(model.getObjectByName("guard-panels")!).length,
        0,
        "側口需包含合法中心與半徑",
      );
    }
  for (const x of [-1.17, 1.17]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, 0.75, 0),
      new THREE.Vector3(0, 0, 1),
      4,
      5.3,
    );
    assert.equal(
      ray.intersectObject(model.getObjectByName("guard-panels")!).length,
      0,
      "前口需包含合法中心與半徑",
    );
  }
  assert.equal(
    model.getObjectByName("exit-over-left")?.userData.finish,
    "over",
  );
  assert.equal(
    model.getObjectByName("exit-over-right")?.userData.finish,
    "over",
  );
  assert.equal(
    model.getObjectByName("exit-extreme")?.userData.finish,
    "extreme",
  );
});

test("細節盤體幾何有限、重複件實例化、透明護牆不使用折射且高度不遮視野", () => {
  const model = createStadium();
  let drawables = 0,
    instances = 0;
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      drawables++;
      for (const n of node.geometry.getAttribute("position").array)
        assert.ok(Number.isFinite(n));
      if (node instanceof THREE.InstancedMesh) {
        instances += node.count;
        for (const n of node.instanceMatrix.array)
          assert.ok(Number.isFinite(n));
      }
    }
  });
  assert.ok(drawables <= 45, `${drawables} drawables`);
  assert.ok(instances >= 150, `${instances} instances`);
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.max.y <= 1.2);
  const guard = model.getObjectByName("guard-panels") as THREE.Mesh;
  assert.equal(
    (guard.material as THREE.MeshStandardMaterial).transparent,
    true,
  );
  assert.equal(
    (guard.material as THREE.MeshStandardMaterial).depthWrite,
    false,
  );
  assert.ok(!("transmission" in guard.material));
});
