import {test} from "node:test";
import assert from "node:assert/strict";
import {DashHitPlayback} from "../src/dash-hit.ts";
import {finishPlayback,cueSamples} from "../src/finish.ts";
import {createBattle} from "../src/physics.ts";
import {BEYS} from "../src/catalog.ts";
const make=()=>createBattle(BEYS[0],BEYS[1],[{power:1,lane:0,angle:0},{power:1,lane:0,angle:0}],1);
test("衝刺命中可交接三種終結，包含同一步決勝；過期及旋轉終結不誤接",()=>{
 for(const kind of ["burst","over","extreme"] as const){
  const b=make(),p=new DashHitPlayback();b.time=20;b.tops[0].dashUntil=20.65;
  b.result={winner:0,finish:kind,points:kind==="extreme"?3:2,time:20};
  const before=structuredClone(b);
  assert.equal(p.trigger({type:"hit",x:0,z:0,strength:7,player:0,time:20},b,1),false);
  assert.equal(p.handoff(b,1.05),true);assert.deepEqual(b,before);
  assert.equal(p.handoff(b,1.6),false);
  assert.equal(p.handoff(b,1.05,true),false);
  b.result.finish="spin";assert.equal(p.handoff(b,1.05),false);
  b.result.finish=kind;b.result.winner=null;assert.equal(p.handoff(b,1.05),false);
  p.reset();b.result.winner=0;assert.equal(p.handoff(b,1.05),false);
 }
});
test("終結播放從命中速度連續恢復，音訊與動畫共用線性速率積分",()=>{
 for(const rate of [.35,.6,1]){
  assert.equal(finishPlayback(0,rate),0);
  const h=.00001;assert.ok(Math.abs(finishPlayback(h,rate)/h-rate)<.001);
  let previous=0;for(let age=0;age<2.3;age+=.005){const next=finishPlayback(age,rate);assert.ok(next>=previous);previous=next;}
  assert.ok(Math.abs((finishPlayback(.4+h,rate)-finishPlayback(.4,rate))/h-1)<.001);
  assert.ok(finishPlayback(2.3,rate)>2.2);
 }
 assert.equal(finishPlayback(.2,1),.2);
});
test("側盤、極限落盤與爆裂零件落地在動畫時點有獨立衝擊聲",()=>{
 const rate=48000,rms=(s:Float32Array,a:number,b:number)=>Math.sqrt(s.subarray(a*rate,b*rate).reduce((sum,v)=>sum+v*v,0)/((b-a)*rate));
 const over=cueSamples("over",rate),extreme=cueSamples("extreme",rate),burst=cueSamples("burst",rate);
 assert.ok(rms(over,.95,.98)>rms(over,.9,.93)*2);
 assert.ok(rms(extreme,.55,.59)>.1);
 assert.ok(rms(burst,1.25,1.28)>.01);assert.ok(rms(burst,.9,1)<.001);
});
