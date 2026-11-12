import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BEYS } from "../src/catalog.ts";
import { beyModel, modelSpec } from "../src/bey-model.ts";
const bey = (code: string) => BEYS.find((b) => b.code === code)!;

test("核心實體低於照片頂面，旋轉時不會有共面深度閃爍", () => {
  for (const b of BEYS) {
    const m = beyModel(b, new THREE.Texture());
    m.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0.04, 1, 0.02),
      new THREE.Vector3(0, -1, 0),
    );
    const core = ray.intersectObject(
      m.getObjectByName("blade-center-core")!,
    )[0];
    const surface = ray.intersectObject(
      m.getObjectByName("blade-product-surface")!,
    )[0];
    assert.ok(surface.point.y - core.point.y > 0.001, b.id);
  }
});

test("同系列的薄圓盤、單擊厚刃與核心分層依各顆照片保留差異", () => {
  assert.ok(
    modelSpec(bey("UX-01")).bladeThickness >
      modelSpec(bey("UX-12")).bladeThickness * 1.4,
  );
  assert.ok(new Set(BEYS.map((b) => modelSpec(b).bladeThickness)).size > 20);
  const thick = beyModel(bey("UX-01"), new THREE.Texture()),
    thin = beyModel(bey("UX-12"), new THREE.Texture());
  const height = (m: THREE.Group) =>
    new THREE.Box3()
      .setFromObject(m.getObjectByName("blade")!)
      .getSize(new THREE.Vector3()).y;
  assert.ok(height(thick) > height(thin) * 1.2);
});

test("軸心平底封閉，開孔盤與固定盤均有接合表面", () => {
  const flat = beyModel(bey("BX-01"), new THREE.Texture());
  flat.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(
    new THREE.Vector3(0.04, -1, 0),
    new THREE.Vector3(0, 1, 0),
  ).intersectObject(flat.getObjectByName("bit-contact")!);
  assert.ok(
    hits.some((h) => Math.abs(h.point.y) < 0.001),
    "平底接觸面不能是空心杯",
  );
  for (const bit of ["DB", "DS", "E"]) {
    const model = beyModel(
      BEYS.find((b) => b.bit === bit)!,
      new THREE.Texture(),
    );
    model.updateMatrixWorld(true);
    const surface = new THREE.Raycaster(
      new THREE.Vector3(0.07, 1, 0),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(model.getObjectByName("bit")!);
    assert.ok(
      surface.some((h) =>
        ["bit-disc-spokes", "bit-guide-disc"].includes(h.object.name),
      ),
      bit + "不能只是懸空環",
    );
  }
});
test("83個模型維持三段爆裂契約，足尖接地、幾何有效、零件可辨", () => {
  for (const b of BEYS) {
    const model = beyModel(b, new THREE.Texture());
    assert.deepEqual(
      model.userData.parts.map((p: THREE.Group) => p.name),
      ["blade", "ratchet", "bit"],
    );
    const bounds = new THREE.Box3().setFromObject(model);
    assert.ok(Math.abs(bounds.min.y) < 0.003, `${b.id}: 足尖 ${bounds.min.y}`);
    assert.ok(bounds.max.y > 0.3 && bounds.max.y < 0.75, b.id);
    const parts = model.userData.parts as THREE.Group[];
    assert.ok(parts[0].children.length >= 4, "戰刃需要分層及內架");
    assert.ok(parts[1].children.length >= 2, "棘輪需要外環及鎖定結構");
    assert.ok(parts[2].children.length >= 3, "軸心需要接地端、齒輪及軸身");
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        const pos = node.geometry.getAttribute("position");
        for (const n of pos.array) assert.ok(Number.isFinite(n), b.id);
        if (node instanceof THREE.InstancedMesh) {
          assert.ok(Number.isInteger(node.count) && node.count > 0, b.id);
          for (const n of node.instanceMatrix.array)
            assert.ok(Number.isFinite(n), b.id);
        }
      }
    });
    for (const color of Object.values(modelSpec(b).colors))
      assert.match(color, /^#[a-f\d]{6}$/i, b.id);
  }
});
test("棘輪是圓環配實際凸齒數，0齒不再生成三角形", () => {
  const zero = BEYS.find((b) => b.ratchet.startsWith("0-"))!;
  assert.equal(modelSpec(zero).ratchetLobes, 0);
  assert.equal(modelSpec(bey("BX-01")).ratchetLobes, 3);
  assert.equal(modelSpec(bey("BX-03")).ratchetLobes, 4);
  const m = beyModel(bey("BX-01"), new THREE.Texture());
  assert.equal(m.getObjectByName("ratchet-lugs")?.userData.count, 3);
});
test("軸心按零件代碼區分接地面，身位與一體式結構有差異", () => {
  assert.equal(modelSpec(bey("BX-01")).tipFamily, "flat");
  assert.equal(modelSpec(bey("BX-03")).tipFamily, "ball");
  assert.equal(modelSpec(bey("BX-04")).tipFamily, "needle");
  assert.equal(modelSpec(bey("BX-15")).tipFamily, "point");
  assert.ok(
    modelSpec(bey("BX-13")).ratchetHeight >
      modelSpec(bey("BX-01")).ratchetHeight,
  );
  assert.equal(modelSpec(bey("UX-19")).integration, "blade");
  assert.equal(modelSpec(bey("CX-07")).integration, "bit");
  for (const code of ["UX-19", "CX-07"]) {
    const m = beyModel(bey(code), new THREE.Texture());
    const links = m.userData.partLinks;
    assert.equal(links[1], links[code === "UX-19" ? 0 : 2]);
  }
});
