import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{roundInsight}from'../src/round-insight.ts';
test('舊版1至4只讀保存的發射與報告，不修改重播內容',()=>{
 for(const version of [1,2,3,4]){const m=JSON.parse(readFileSync(new URL(`./fixtures/v${version}-match.json`,import.meta.url),'utf8'));const before=JSON.stringify(m);for(const r of m.rounds){const a=roundInsight(r);assert.ok(a.reason.length>0);assert.equal(a.rows[0].values[0],Math.round(r.inputs[0].power*100)+'%');}assert.equal(JSON.stringify(m),before);}
});
test('終結說明依實際判定，缺少碰撞資料不補成0或捏造因果占比',()=>{
 const m=JSON.parse(readFileSync(new URL('./fixtures/v4-match.json',import.meta.url),'utf8')),r=m.rounds[0];
 for(const finish of ['spin','burst','over','extreme']){r.result.finish=finish;r.result.winner=0;const a=roundInsight(r);assert.ok(a.reason.length>0);assert.ok(a.rows.some((row:any)=>row.label==='極限衝刺次數'));}
 r.reports=[];assert.equal(roundInsight(r).complete,false);assert.ok(roundInsight(r).rows.some((row:any)=>row.values.includes('未記錄')));
 r.result.winner=null;r.result.points=0;assert.match(roundInsight(r).reason,/平手.*不加分/);
});

import{BEYS}from'../src/catalog.ts';import{createBattle,stepBattle}from'../src/physics.ts';import{createMatch,applyRound}from'../src/match.ts';
test('新版5保存的報告數值可展示，分析不改變對戰與重播輸入',()=>{
 const inputs=[{power:.9,lane:1,angle:10,direction:-1 as const},{power:.8,lane:2,angle:20,direction:1 as const}],battle=createBattle(BEYS[0],BEYS[1],inputs,55);
 while(!battle.result&&battle.time<40)stepBattle(battle);
 const m=createMatch([[BEYS[0],BEYS[1],BEYS[2]],[BEYS[1],BEYS[2],BEYS[0]]],'local','normal',55);
 applyRound(m,battle.result!,inputs,battle.shouts,battle);const r=m.rounds[0],before=JSON.stringify(r),insight=roundInsight(r);
 assert.equal(insight.complete,true);assert.deepEqual(insight.rows[0].values,['90%','80%']);assert.deepEqual(insight.rows[3].values,['內切','外切']);
 assert.equal(insight.rows[4].values[0],r.reports[0].impulse.toFixed(1));assert.equal(JSON.stringify(r),before);
});
