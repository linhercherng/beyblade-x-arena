import{test}from'node:test';import assert from'node:assert/strict';
import{replayMix,replayAccentSamples}from'../src/replay-audio.ts';
import{Arena}from'../src/arena.ts';import * as THREE from'three';
test('重播定格收窄配樂、追鏡與終結平滑恢復，離開回到原混音',()=>{
 const track=replayMix('tracking'),hit=replayMix('impact'),decision=replayMix('decision'),finish=replayMix('finish'),normal=replayMix(null);
 assert.equal(normal.gain,1);assert.ok(normal.cutoff>=20000);
 for(const hold of [hit,decision]){assert.ok(hold.gain<track.gain);assert.ok(hold.cutoff<track.cutoff);assert.ok(hold.seconds<=.02);}
 assert.ok(finish.gain>decision.gain&&finish.gain<=track.gain);assert.ok(finish.cutoff>decision.cutoff);assert.ok(track.seconds>=.08);
});
test('兩種重播強調音在常用取樣率有界、非靜音、各自可辨且尾音歸零',()=>{
 for(const rate of [44100,48000]){const signatures=[];for(const kind of ['impact','decision']as const){const s=replayAccentSamples(kind,rate);assert.ok(s.length>=rate*.2&&s.length<=rate*.5);assert.ok(s.every(Number.isFinite));assert.ok(s.reduce((p,v)=>Math.max(p,Math.abs(v)),0)<=.80001);assert.ok(s.reduce((sum,v)=>sum+v*v,0)/s.length>.001);assert.ok(Math.abs(s.at(-1)!)<.001);signatures.push(Array.from(s.subarray(100,110)).join());}assert.notEqual(...signatures as [string,string]);}
});
test('重播音源左右聲道依鏡位反轉且維持有限範圍',()=>{
 const camera=new THREE.PerspectiveCamera(39,1,.1,100),view={camera,cameraFocus:new THREE.Vector3()};
 camera.position.set(0,4,8);camera.lookAt(0,0,0);assert.ok(Arena.prototype.soundPan.call(view as Arena,1,0)>0);
 camera.position.set(0,4,-8);camera.lookAt(0,0,0);assert.ok(Arena.prototype.soundPan.call(view as Arena,1,0)<0);
 assert.ok(Math.abs(Arena.prototype.soundPan.call(view as Arena,99,99))<=.8);
});
