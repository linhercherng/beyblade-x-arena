import { test } from "node:test";
import assert from "node:assert/strict";
import { BEYS } from "../src/catalog.ts";
import { createBattle, stepBattle, DT } from "../src/physics.ts";
test("高轉速受擊可通過實際出口，越過盤緣後不被護牆拉回", () => {
  for (const finish of ["over", "extreme"]) {
    const s = createBattle(BEYS[0], BEYS[1], [{power:1,lane:1,angle:0},{power:1,lane:1,angle:0}], 3);
    s.tick=16/DT; s.time=16;
    Object.assign(s.tops[0], { x:finish==='over'?4.12:0,z:finish==='over'?0:4.12,vx:finish==='over'?5:0,vz:finish==='over'?0:5,rpm:.6,hitUntil:17 });
    Object.assign(s.tops[1],{x:-1,z:-1});
    for(let i=0;i<90&&!s.result;i++)stepBattle(s);
    assert.equal(s.result?.finish,finish);
    assert.equal(s.result?.winner,1);
    assert.ok(s.tops[0].rpm>.5);
  }
});
test("同條件防禦反擊不因玩家處理先後而給第二方額外衝量", () => {
  const a = BEYS.find(b=>b.type==='defense')!;
  const s = createBattle(a,a,[{power:1,lane:0,angle:0},{power:1,lane:0,angle:0}],1);
  s.tick=16/DT;s.time=16;
  s.tops.forEach((t,i)=>Object.assign(t,{x:i?.3:-.3,z:0,vx:i?-4:4,vz:0,rpm:.7}));
  stepBattle(s);
  assert.ok(Math.abs(s.tops[0].maxImpulse-s.tops[1].maxImpulse)<1e-9);
});
test("出口附近被反撞回盤內後恢復護牆，不會穿過封閉的後壁", () => {
  const s = createBattle(BEYS[0],BEYS[1],[{power:1,lane:0,angle:0},{power:1,lane:0,angle:0}],1);
  s.tick=16/DT;s.time=16;
  Object.assign(s.tops[0],{x:0,z:-3.8,vx:0,vz:-7,rpm:.8,hitUntil:20,exiting:"over"});
  Object.assign(s.tops[1],{x:2,z:0});
  for(let i=0;i<30;i++)stepBattle(s);
  assert.equal(s.result,null);
  assert.equal(s.tops[0].exiting,undefined);
  assert.ok(Math.hypot(s.tops[0].x,s.tops[0].z)<4.25);
});
test("兩顆實際通過出口後互撞回場內，下一步取消離盤狀態", () => {
  const s=createBattle(BEYS[0],BEYS[0],[{power:1,lane:0,angle:0},{power:1,lane:0,angle:0}],1);
  s.tick=16/DT;s.time=16;
  Object.assign(s.tops[0],{x:4.08,z:-.3,vx:3,vz:5,rpm:.9,hitUntil:17,railCooldown:18});
  Object.assign(s.tops[1],{x:4.23,z:.2,vx:3,vz:-5,rpm:.9,hitUntil:17,railCooldown:18});
  stepBattle(s);
  assert.equal(s.tops[0].exiting,"over");
  assert.ok(Math.hypot(s.tops[0].x,s.tops[0].z)<4.094);
  stepBattle(s);
  assert.equal(s.tops[0].exiting,undefined);
});

test("從前方極限出口斜向離盤仍為3分，不因末端橫移改判越界", () => {
  const s=createBattle(BEYS[0],BEYS[1],[{power:1,lane:0,angle:0},{power:1,lane:0,angle:0}],1);
  s.tick=16/DT;s.time=16;
  Object.assign(s.tops[0],{x:1.1,z:4,vx:5,vz:3,rpm:.6,hitUntil:17,railCooldown:18});
  Object.assign(s.tops[1],{x:-1,z:-1});
  for(let i=0;i<120&&!s.result;i++)stepBattle(s);
  assert.equal(s.result?.finish,"extreme");assert.equal(s.result?.points,3);
});
