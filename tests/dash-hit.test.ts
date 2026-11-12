import{test}from"node:test";
import assert from"node:assert/strict";
import{DashHitPlayback,hitZoomFactor}from"../src/dash-hit.ts";
import{BEYS,getBey}from"../src/catalog.ts";
import{createBattle,stepBattle,shout,DT}from"../src/physics.ts";
import examples from"./fixtures/v4-combat.json" with {type:"json"};
const make=()=>createBattle(BEYS[0],BEYS[1],[{power:1,lane:0,angle:0},{power:1,lane:0,angle:0}],1);
const hit={type:"hit" as const,x:0,z:0,strength:7,player:0,time:1};
test("只有有效衝刺命中觸發，同一衝刺與密集碰撞不重播慢動作",()=>{
  const b=make(),p=new DashHitPlayback();
  assert.equal(p.trigger(hit,b,0),false);b.tops[0].dashUntil=1.65;
  assert.equal(p.trigger({...hit,strength:.5},b,0),false);
  const before=structuredClone(b);assert.equal(p.trigger(hit,b,0),true);assert.deepEqual(b,before);
  assert.equal(p.trigger(hit,b,1),false);
  b.tops[1].dashUntil=1.8;assert.equal(p.trigger(hit,b,.1),false);
  assert.equal(p.trigger(hit,b,2),false);
  b.tops[0].dashUntil=4;assert.equal(p.trigger({...hit,time:3.4},b,2),true);
  b.result={winner:0,finish:"burst",points:2,time:3.4};b.tops[1].dashUntil=4.1;
  assert.equal(p.trigger({...hit,time:3.4},b,3),false);
});
test("慢動作短促有界並恢復，減少動態及重設立即回到正常速度",()=>{
  const b=make(),p=new DashHitPlayback();b.tops[0].dashUntil=2;p.trigger(hit,b,1);
  assert.ok(p.sample(1.02).scale<.3);assert.ok(p.sample(1.1).zoom>0);
  assert.equal(p.sample(1.31).scale,1);assert.equal(p.sample(1.5).zoom,0);
  assert.deepEqual(p.sample(1.02,true),{scale:1,zoom:0,shock:0});
  p.reset();assert.deepEqual(p.sample(1.02),{scale:1,zoom:0,shock:0});
  assert.ok(hitZoomFactor(10,8,1)>=.8);assert.equal(hitZoomFactor(8,8,1),1);
});
test("慢動作播放相同輸入，四種自然終結的物理結果與整體狀態完全一致",()=>{
  for(const e of Object.values(examples)){
    const run=(slow:boolean)=>{
      const b=createBattle(getBey(e.beys[0]),getBey(e.beys[1]),e.launches,e.seed),p=new DashHitPlayback();let clock=0,acc=0,triggered=0;
      while(!b.result&&clock<45){clock+=1/60;acc+=1/60*(slow?p.sample(clock).scale:1);
        while(acc>=DT&&!b.result){for(const i of[0,1]as const)if(e.shouts[i].includes(b.tick))shout(b,i);stepBattle(b);if(slow)for(const event of b.events)triggered+=Number(p.trigger(event,b,clock));acc-=DT;}}
      assert.ok(b.result);if(slow)assert.ok(triggered>0);return b;
    };
    assert.deepEqual(run(true),run(false));
  }
});
