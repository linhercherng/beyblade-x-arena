import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {getBey} from '../src/catalog.ts';
import {beyModel,modelSpec,MODEL_REFERENCES} from '../src/bey-model.ts';
import {PRODUCT_IMAGES} from '../src/appearance.ts';
import {combatProfile} from '../src/combat-profiles.ts';

const cases=[['bx-00-dran-sword-v2','bx-01-dran-sword'],['cx-20-hells-scythe-v2','bx-02-hells-scythe']] as const;
const modelBey=(id:string,original:string)=>({...getBey(original),id});

test('V2依各自原廠照片建立獨立實體刃肩與核心，保留三段接地結構',()=>{
 for(const[id,original]of cases){
  const b=modelBey(id,original),old=getBey(original),spec=modelSpec(b);
  assert.ok(spec.profile&&spec.reference,id);
  assert.equal(spec.photo.shape.length,72);
  assert.notDeepEqual(spec.photo.shape,modelSpec(old).photo.shape);
  assert.notEqual(spec.bladeThickness,modelSpec(old).bladeThickness);
  const model=beyModel(b,new THREE.Texture()),before=beyModel(old,new THREE.Texture());
  assert.deepEqual(model.userData.parts.map((p:THREE.Group)=>p.name),['blade','ratchet','bit']);
  const bounds=new THREE.Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y)<.003&&bounds.max.y>.3&&bounds.max.y<.75,id);
  for(const name of ['blade-metal-shoulders','blade-center-core','blade-product-surface']){
   const actual=model.getObjectByName(name) as THREE.Mesh,previous=before.getObjectByName(name) as THREE.Mesh;
   assert.notDeepEqual(Array.from(actual.geometry.getAttribute('position').array),Array.from(previous.geometry.getAttribute('position').array),id+'/'+name);
  }
  model.traverse(node=>{
   if(node instanceof THREE.Mesh){
    assert.ok(Array.from(node.geometry.getAttribute('position').array).every(Number.isFinite),id+'/'+node.name);
    if(node instanceof THREE.InstancedMesh)assert.ok(Array.from(node.instanceMatrix.array).every(Number.isFinite),id+'/'+node.name);
   }
  });
  const traits=combatProfile(id,b.bit,b.height,Number(b.ratchet.split('-')[0]),b.type);
  const oldTraits=combatProfile(old.id,old.bit,old.height,Number(old.ratchet.split('-')[0]),old.type);
  assert.notDeepEqual([traits.contact,traits.inertia,traits.balance,traits.mass],[oldTraits.contact,oldTraits.inertia,oldTraits.balance,oldTraits.mass]);
 }
});

test('V2模型引用原始照片SHA；Hells刃片不冒充原廠完整4-60T或斜視圖',()=>{
 for(const[id,original]of cases){
  const ref=MODEL_REFERENCES[id],photo=PRODUCT_IMAGES[id];
  assert.ok(ref&&photo,id);
  assert.equal(ref.top.src,photo.src);
  assert.match(ref.source,/^https:\/\/beyblade\.takaratomy\.co\.jp\//);
  assert.match(modelSpec(modelBey(id,original)).profile.note,/近似|估/);
  for(const item of [ref.top,ref.side].filter(Boolean)){
   const bytes=readFileSync(new URL('../public'+item!.src,import.meta.url));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),(item as typeof ref.top).sha256);
  }
 }
 const dran=MODEL_REFERENCES[cases[0][0]],hells=MODEL_REFERENCES[cases[1][0]];
 assert.equal(dran.top.teeth,3);assert.ok(dran.side);assert.equal(dran.confidence,'official-combo');
 assert.equal(hells.top.teeth,4);assert.equal(hells.top.kind,'blade');assert.equal(hells.side,null);
 assert.equal(hells.ratchetPhoto,null);assert.equal(hells.bitPhoto,null);
 assert.notEqual(hells.confidence,'official-combo');assert.match(hells.note,/遊戲.*4-60T/);assert.match(hells.note,/非原廠.*組合/);
});
