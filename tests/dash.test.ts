import {test} from "node:test";
import assert from "node:assert/strict";
import {dashVisual,dashSamples,hasRail} from "../src/dash.ts";
test("三個出口不偽造咬合火花，實際齒段可顯示接觸",()=>{
  assert.equal(hasRail(3.5,0),false);assert.equal(hasRail(-3.5,0),false);assert.equal(hasRail(0,3.5),false);
  assert.equal(hasRail(3.5,2),true);assert.equal(hasRail(0,-3.5),true);assert.equal(hasRail(NaN,0),false);
});
test("咬合短暫貼軌後平滑釋放、衝刺拖尾收束，減少動態不偏移模型",()=>{
  assert.equal(dashVisual(0).latch,0);
  assert.equal(dashVisual(.025).latch,1);
  assert.ok(dashVisual(.05).latch>dashVisual(.1).latch);
  assert.equal(dashVisual(.13).latch,0);
  assert.ok(dashVisual(.16).intensity>.8);
  assert.equal(dashVisual(.9).intensity,0);
  assert.deepEqual(dashVisual(.1,true),{latch:0,intensity:0,lean:0});
  for(let t=-.1;t<1;t+=.007)for(const v of Object.values(dashVisual(t)))assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
});
test("咬合齒鳴與加速風切合成音非靜音、無削波且尾音歸零",()=>{
  for(const rate of [44100,48000])for(const grip of [false,true]){
    const a=dashSamples(rate,grip);
    assert.ok(a.length>=rate*.5&&a.length<=rate*.75);
    assert.ok(a.every(Number.isFinite));
    let peak=0,energy=0;for(const n of a){peak=Math.max(peak,Math.abs(n));energy+=n*n;}
    assert.ok(peak<=.85&&Math.sqrt(energy/a.length)>.03);
    assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1)!)<.001);
    assert.deepEqual(a,dashSamples(rate,grip));
  }
});
