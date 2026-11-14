import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BEYS } from "../src/catalog.ts";
import { beyModel, modelSpec } from "../src/bey-model.ts";

const byCode = (code: string) => BEYS.find((b) => b.code === code)!;
const model = (code: string) => {
  const result = beyModel(byCode(code), new THREE.Texture());
  result.updateMatrixWorld(true);
  return result;
};
const underside = (object: THREE.Object3D, x: number, z: number) =>
  new THREE.Raycaster(new THREE.Vector3(x, -1, z), new THREE.Vector3(0, 1, 0))
    .intersectObject(object, true)[0]?.point.y;

test("C 軸底面有螺旋接觸紋與凹下流道，並非整片相同高度的平底", () => {
  const bit = model("BX-34").getObjectByName("bit")!;
  const heights = Array.from({ length: 24 }, (_, i) => {
    const a = i / 24 * Math.PI * 2;
    return underside(bit, Math.cos(a) * .042, Math.sin(a) * .042)!;
  });
  assert.ok(heights.every(Number.isFinite));
  assert.ok(Math.max(...heights) - Math.min(...heights) > .003,
    "螺旋紋和流道必須有可見深度差");
  assert.ok(Math.min(...heights) < .003);
});

test("D 軸以多個接地小凸點取代單根針尖", () => {
  const bit = model("BX-35").getObjectByName("bit")!;
  const contacts = [[0, 0], [.014, 0], [-.014, 0], [0, .014], [0, -.014]];
  for (const [x, z] of contacts)
    assert.ok(underside(bit, x, z)! < .002, "各凸點都應位於接地端");
  assert.ok(underside(bit, .007, .007)! > .004, "凸點之間保留凹隙");
  const material = (bit.getObjectByName("bit-shaft") as THREE.Mesh)
    .material as THREE.MeshStandardMaterial;
  assert.equal(material.color.getHexString(), "314b40");
});

test("L 軸保留三階同軸接觸面，中心留淺凹而非封成同一平面", () => {
  const contact = model("UX-09").getObjectByName("bit-contact")!;
  const center = underside(contact, 0, 0)!;
  const low = underside(contact, .045, 0)!;
  const middle = underside(contact, .075, 0)!;
  const high = underside(contact, .098, 0)!;
  assert.ok(center > low + .004, "中心淺凹應高於接地環");
  assert.ok(low < .002 && middle > low + .01 && high > middle + .01);
});

test("2-60 與 2-70 分出雙凸瓣外殼與不同色的透明內件", () => {
  for (const [code, innerColor] of [["BX-34", "c02b35"], ["UX-09", "e4eee7"]]) {
    const ratchet = model(code).getObjectByName("ratchet")!;
    const inner = ratchet.getObjectByName("ratchet-inner-insert") as THREE.Mesh;
    assert.ok(inner, code + " 缺少內件");
    const material = inner.material as THREE.MeshStandardMaterial;
    assert.equal(material.color.getHexString(), innerColor);
    assert.ok(material.transparent);
    const lugs = ratchet.getObjectByName("ratchet-lugs") as THREE.InstancedMesh;
    assert.equal(lugs.count, 2);
    assert.ok(lugs.geometry.getAttribute("position").count > 50,
      "凸瓣應有弧形側面，而非相同方盒");
  }
});

test("Black Shell 側面護刃往外下降，Samurai Saber 保留兩組金屬翼軸", () => {
  const shell = model("BX-35");
  const guards = shell.getObjectByName("blade-downward-guards")!;
  assert.ok(guards, "護刃需要實際幾何，不能只依賴照片貼圖");
  const inner = new THREE.Raycaster(new THREE.Vector3(.39, 1, 0), new THREE.Vector3(0, -1, 0))
    .intersectObject(guards, true)[0];
  const outer = new THREE.Raycaster(new THREE.Vector3(.46, 1, 0), new THREE.Vector3(0, -1, 0))
    .intersectObject(guards, true)[0];
  assert.ok(inner && outer && inner.point.y > outer.point.y + .015);
  const spec = modelSpec(byCode("BX-35"));
  const bladeBase = spec.bitHeight + spec.ratchetHeight - .009;
  assert.ok(Array.from({ length: 32 }, (_, i) => {
    const a = i / 32 * Math.PI * 2, direction = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    return [.01, .025, .04, .06, .08].some(y => {
      const first = new THREE.Raycaster(direction.clone().setY(bladeBase + y), direction.clone().negate())
        .intersectObject(shell.getObjectByName("blade")!, true)[0];
      return first?.object.name === "blade-downward-guard";
    });
  }).some(Boolean), "護刃至少有部分側面露在原始外殼之外，不能整組藏在內部");
  const hinges = model("UX-09").getObjectByName("blade-wing-pivots") as THREE.InstancedMesh;
  assert.equal(hinges?.count, 2);
});

test("精修只影響網格，原本模型參數、三段爆裂契約及輸入保持原樣", () => {
  const expected = {
    "BX-34": { family: "flat", tip: .083, gear: .083, blade: .126, lobes: 2, bit: "#105090" },
    "BX-35": { family: "needle", tip: .048, gear: .083, blade: .115, lobes: 4, bit: "#29924f" },
    "UX-09": { family: "stepped", tip: .105, gear: .083, blade: .118, lobes: 2, bit: "#501090" },
  };
  for (const [code, legacy] of Object.entries(expected)) {
    const b = byCode(code), beforeBey = JSON.stringify(b), beforeSpec = JSON.stringify(modelSpec(b));
    const m = model(code), spec = modelSpec(b);
    assert.deepEqual({ family: spec.tipFamily, tip: spec.profile.tipRadius,
      gear: spec.profile.gearRadius, blade: spec.bladeThickness,
      lobes: spec.ratchetLobes, bit: spec.colors.bit }, legacy);
    assert.equal(JSON.stringify(b), beforeBey);
    assert.equal(JSON.stringify(spec), beforeSpec);
    assert.deepEqual(m.userData.parts.map((p: THREE.Group) => p.name), ["blade", "ratchet", "bit"]);
    assert.deepEqual(m.userData.partLinks, [0, 1, 2]);
    const bounds = new THREE.Box3().setFromObject(m);
    assert.ok(Math.abs(bounds.min.y) < .003 && bounds.max.y < .75);
    m.traverse(node => {
      if (node instanceof THREE.Mesh)
        assert.ok(Array.from(node.geometry.getAttribute("position").array).every(Number.isFinite));
    });
  }
});
