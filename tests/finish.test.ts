import { test } from "node:test";
import assert from "node:assert/strict";
import { exitPose, burstPose, cueSamples, scorePreview } from "../src/finish.ts";
import * as THREE from "three";
import { BEYS } from "../src/catalog.ts";
import { beyModel } from "../src/bey-model.ts";
import { keepAboveFloor, settleBurstParts } from "../src/arena.ts";

test("實際傾斜模型落地不穿接盤，爆裂連接件不穿碗面", () => {
  const g = beyModel(BEYS.find(b => b.name.includes("Phoenix Wing"))!, new THREE.Texture());
  g.rotation.set(.26, .95*13, 1.15); g.position.set(5.65,.13,0);
  keepAboveFloor(g,.105);
  assert.ok(new THREE.Box3().setFromObject(g,true).min.y >= .10499);
  g.position.set(3.5,.33,0);g.rotation.set(.26,.7,.15);
  (g.userData.parts as THREE.Group[]).forEach((part,i)=>part.position.set(i*.25,-.2,0));
  settleBurstParts(g);
  for(const part of g.userData.parts as THREE.Group[]){
    const box=new THREE.Box3().setFromObject(part,true);
    const r2=Math.max(box.min.x**2,box.max.x**2)+Math.max(box.min.z**2,box.max.z**2);
    assert.ok(box.min.y >= Math.min(r2,4.25**2)*.024-.03,part.name);
  }
});
test("近牆爆裂不將碗面曲率外推至盤外而懸空", () => {
  const g=beyModel(BEYS[0],new THREE.Texture());
  const parts=g.userData.parts as THREE.Group[];
  const floors=parts.map(part=>new THREE.Box3().setFromObject(part,true).min.y);
  g.position.set(3.9,.4,0);
  parts.forEach((part,i)=>{const p=burstPose(1.4,i,floors[i]);part.position.set(p.x,p.y,p.z);});
  settleBurstParts(g);
  assert.ok(new THREE.Box3().setFromObject(parts[0],true).min.y <= .43);
});

test("越界拋物線進側盤，極限沿前方出口快衝後停在接盤", () => {
  const origin = { x: 4.3, y: .48, z: 0 };
  assert.deepEqual(exitPose("over", 0, origin), { ...origin, tilt: 0 });
  assert.ok(exitPose("over", .45, origin).y > origin.y);
  const end = exitPose("over", 1.3, origin);
  assert.equal(end.x, 5.65);
  assert.equal(end.z, 0);
  assert.equal(end.y, .13);
  assert.deepEqual(exitPose("over", 3, origin), end);
  const extreme = exitPose("extreme", .7, { x: .3, y: .48, z: 4.3 });
  assert.equal(extreme.z, 5.65);
  assert.equal(extreme.x, .3);
  assert.equal(extreme.y, .13);
  assert.notEqual(end.tilt, extreme.tilt);
});
test("爆裂三段方向不同、有限且終點穩定，一體式連接沿用同索引", () => {
  const parts = [0, 1, 2].map(link => burstPose(1.4, link, .15));
  assert.equal(new Set(parts.map(p => `${p.x}:${p.z}`)).size, 3);
  assert.deepEqual(burstPose(3, 0, .15), parts[0]);
  assert.deepEqual(burstPose(.3, 0, .1), burstPose(.3, 0, .1));
  for (const p of parts) assert.ok(Object.values(p).every(Number.isFinite));
  assert.deepEqual(burstPose(.1, 1, .1, true), burstPose(1, 1, .1, true));
});
test("各終結與勝負音效波形獨立、非靜音、不削波且尾音歸零", () => {
  const fingerprints = new Set<string>();
  for (const kind of ["burst", "over", "extreme", "spin", "draw", "victory", "defeat"] as const) {
    const samples = cueSamples(kind, 48000);
    assert.ok(samples.length >= 24000 && samples.length <= 76800);
    assert.ok(samples.every(Number.isFinite));
    assert.ok(samples.reduce((m,v) => Math.max(m, Math.abs(v)), 0) <= .86);
    assert.ok(samples.reduce((s,v) => s+v*v, 0) / samples.length > .001);
    assert.ok(Math.abs(samples.at(-1)!) < .001);
    fingerprints.add(Array.from(samples.subarray(1000, 1010)).join(","));
  }
  assert.equal(fingerprints.size, 7);
});
test("比分預覽不改正式比分，平手不加分", () => {
  const scores = [1, 2];
  assert.deepEqual(scorePreview({ winner: 0, finish: "extreme", points: 3, time: 20 }, scores), [4, 2]);
  assert.deepEqual(scores, [1, 2]);
  assert.deepEqual(scorePreview({ winner: null, finish: "burst", points: 0, time: 20 }, scores), scores);
});
