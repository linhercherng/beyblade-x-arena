import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BEYS, bits, getBey, CHINESE_NAMES, filterBeys } from "../src/catalog.ts";
import { beyModel, modelSpec, MODEL_REFERENCES } from "../src/bey-model.ts";
import legacy from "./fixtures/catalog-v080.json" with { type: "json" };

const ids = ["cx-00-valkyrie-volt-slash", "cx-00-bucks-antlers-bumper", "cx-00-kraken-wriggle-slash", "cx-00-hornet-fort-round", "cx-00-drake-brave-gravity", "bx-00-storm-pegasus", "bx-00-storm-spriggan", "cx-00-tiga-rage-flow-turn"];
test("新增8款獨立型號，圖鑑91顆且保留原83顆ID及能力值", () => {
  assert.equal(BEYS.length, 91);
  assert.equal(new Set(BEYS.map(b => b.id)).size, 91);
  for (const previous of legacy) {
    const {id,stats,spin,ratchet,bit,height}=getBey(previous.id);
    assert.deepEqual({id,stats,spin,ratchet,bit,height},previous);
  }
  for(const id of ids)assert.ok(BEYS.some(b=>b.id===id),id);
});
test("限定同品號使用逐款日期與來源，中文譯名可搜尋且不冒稱官方中文", () => {
  assert.equal(getBey(ids[0]).released,"2026-11-05");
  assert.equal(getBey(ids[5]).released,"2026-07-11");
  assert.equal(getBey(ids[6]).released,"2026-03-28");
  assert.match(getBey(ids[0]).spinNote,/推定/);
  assert.match(getBey(ids[6]).spinNote,/推定/);
  assert.equal(getBey(ids[5]).spinNote,"");
  for(const id of ids){
    const b=getBey(id);
    assert.match(b.source,/^https:\/\/beyblade.takaratomy.co.jp\//);
    assert.match(b.zhName,/[\u3400-\u9fff]/);
    assert.equal(CHINESE_NAMES[id].status,"translated");
    assert.ok(filterBeys(b.zhName).some(v=>v.id===id));
    assert.ok(Object.values(b.stats).every(Number.isFinite),id);
  }
});
test("新增型號有獨立實物輪廓、側視與三段模型，RA有實心橡膠接觸端", () => {
  const shapes=new Set<string>();
  for(const id of ids){
    const b=getBey(id), ref=MODEL_REFERENCES[id], spec=modelSpec(b);
    assert.ok(ref.top && ref.side,id);
    assert.equal(ref.top.shape.length,72);
    assert.ok(spec.bladeThickness>0 && spec.profile.source.startsWith("https://"));
    shapes.add(JSON.stringify(ref.top.shape));
    const model=beyModel(b,new THREE.Texture());
    assert.equal(model.userData.parts.length,3);
  }
  assert.equal(shapes.size,8);
  assert.equal(bits.RA.provisional,false);
  assert.equal(bits.RA.type,"attack");
  assert.ok(beyModel(getBey(ids[5]),new THREE.Texture()).getObjectByName("bit-rubber-contact"));
});
