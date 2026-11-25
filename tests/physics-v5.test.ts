import {test} from "node:test";
import assert from "node:assert/strict";
import {BEYS, getBey,ratchets,bits} from "../src/catalog.ts";
import {profileStats} from "../src/combat-profiles.ts";
import {createBattle as createLatest,stepBattle,shout,energize,ROTATION_ENERGY,type Launch} from "../src/physics.ts";
import examples from "./fixtures/v4-combat.json" with {type:"json"};
import legacy from "../src/legacy-stats-v4.json" with {type:"json"};
const input={power:.9,lane:1,angle:0};
const createBattle=(a:typeof BEYS[number],b:typeof BEYS[number],inputs:readonly Launch[],seed:number,version:1|2|3|4|5=5)=>createLatest(a,b,inputs,seed,version);
test("v5傾角建立傾斜，方向和落點影響軌跡，力量影響初始能量",()=>{
  assert.equal(createBattle(BEYS[0],BEYS[1],[input,input],55).version,5);
  const a=BEYS[0],b=BEYS[1];
  const make=(change:object)=>createBattle(a,b,[{...input,...change},input],55);
  const flat=make({}),angled=make({angle:30}),reverse=make({angle:30,direction:-1});
  assert.equal(flat.tops[0].tilt,0);assert.ok(angled.tops[0].tilt>.4);
  assert.ok(make({power:1}).tops[0].rpm>make({power:.65}).tops[0].rpm);
  assert.ok(Math.hypot(make({lane:2}).tops[0].x,make({lane:2}).tops[0].z)>3);
  for(let n=0;n<240;n++){stepBattle(flat);stepBattle(angled);stepBattle(reverse);}
  assert.ok(Math.hypot(flat.tops[0].x-angled.tops[0].x,flat.tops[0].z-angled.tops[0].z)>.1);
  assert.notDeepEqual(angled.tops[0],reverse.tops[0]);
  assert.throws(()=>make({direction:2}));
  for(const spin of ["R","L"] as const){
    const radial=(direction:-1|1)=>{
      const s=createBattle({...a,spin},b,[{...input,angle:30,direction},input],55),t=s.tops[0];
      return t.x*t.vx+t.z*t.vz;
    };
    assert.ok(radial(-1)<radial(1),`${spin}的內切與外切方向`);
  }
});
test("發射、驅動與衝刺的平移能量有代價，低轉速不會憑空加速",()=>{
  const s=createBattle(BEYS[0],BEYS[1],[input,input],55),t=s.tops[0];
  const energy=()=>ROTATION_ENERGY*t.motion!.profile.inertia*t.rpm*t.rpm+
    .5*t.bey.stats.weight/70*(t.vx*t.vx+t.vz*t.vz);
  for(const rpm of [1,.2,.001,0]){
    t.rpm=rpm;t.vx=0;t.vz=0;
    const before=energy();energize(t,100,100);
    assert.ok(energy()<=before+1e-8);assert.ok(Number.isFinite(t.rpm));
    assert.ok(t.rpm>=0&&t.rpm<=rpm);
  }
  assert.equal(t.vx,0);assert.equal(t.vz,0);
});
test("低轉速鏡像碰撞雙方同時付能，不因玩家處理順序改變回彈",()=>{
  const s=createBattle(BEYS[0],BEYS[0],[input,input],55);
  s.tick=1920;s.time=16;
  s.tops[1].motion={...s.tops[0].motion!};
  s.tops.forEach((t,i)=>{
    Object.assign(t,{x:i?.3:-.3,z:0,vx:i?-2:2,vz:0,rpm:.03,tilt:0,axisX:0,axisZ:0,hitUntil:100,railCooldown:100});
    t.motion!.phase=i?Math.PI:0;
  });
  stepBattle(s);
  assert.ok(Math.abs(s.tops[0].vx+s.tops[1].vx)<1e-9);
  assert.ok(Math.abs(s.tops[0].rpm-s.tops[1].rpm)<1e-9);
  assert.ok(Math.abs(s.tops[0].motion!.energyUsed-s.tops[1].motion!.energyUsed)<1e-9);
});
test("v4凍結能力及四種原始終結，改版後仍逐次確定",()=>{
  for(const e of Object.values(examples)){
    const changed={...getBey(e.beys[0]),stats:{atk:1,def:1,sta:1,dash:1,burst:1,weight:1}};
    const battle=createBattle(changed,getBey(e.beys[1]),e.launches,e.seed,4);
    assert.deepEqual(battle.tops[0].bey.stats,legacy[changed.id as keyof typeof legacy]);
    while(!battle.result&&battle.time<40){
      for(const p of [0,1] as const)if(e.shouts[p].includes(battle.tick))shout(battle,p);
      stepBattle(battle);
    }
    assert.equal(battle.result?.time,e.time);assert.equal(battle.result?.winner,e.winner);
    assert.equal(battle.result?.finish,Object.entries(examples).find(([,v])=>v===e)![0]);
  }
});
test("v5種子固定、運氣有界，全部91款特性有限且來源清楚",()=>{
  const a=createBattle(BEYS[0],BEYS[1],[input,input],99),b=createBattle(BEYS[0],BEYS[1],[input,input],99);
  for(let n=0;n<600;n++){stepBattle(a);stepBattle(b);}
  assert.deepEqual(a,b);
  assert.notDeepEqual(createBattle(BEYS[0],BEYS[1],[input,input],100).tops,createBattle(BEYS[0],BEYS[1],[input,input],99).tops);
  const original=BEYS.filter(bey=>Object.hasOwn(legacy,bey.id));
  assert.equal(original.length,91);
  for(const bey of original){
    const t=createBattle(bey,bey,[input,input],55).tops[0];
    assert.ok(t.motion);assert.ok(t.motion.efficiency>=.97&&t.motion.efficiency<=1.03);
    assert.ok(t.motion.friction>=.98&&t.motion.friction<=1.02);
    assert.ok(Object.values(bey.stats).every(Number.isFinite));
    assert.ok(t.motion.profile.source.startsWith("https://"));
    const r=ratchets[bey.ratchet],bit=bits[bey.bit];
    assert.deepEqual(profileStats(t.motion.profile,bey.type,bit.dash,bit.burst+5-r.sides*.7+(70-r.height)*.15),t.bey.stats);
    const s=createBattle(bey,bey,[{...input,angle:30,direction:1},{...input,angle:0,direction:-1}],55);
    while(!s.result&&s.time<40){
      stepBattle(s);
      assert.ok(s.tops.every(v=>[v.x,v.z,v.vx,v.vz,v.rpm,v.burst,v.tilt,v.rotation,v.axisX,v.axisZ].every(Number.isFinite)),bey.id);
    }
    assert.ok(s.result&&s.time>=15&&s.time<=40);
  }
});
