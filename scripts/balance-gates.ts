import assert from 'node:assert/strict';
type Bounds={battles:number;minSeconds:number;maxSeconds:number;outsideTarget:number};
type Suite=Bounds&{types:Record<string,{played:number;wins:number;draws:number}>;finishes:Record<string,number>};
export function assertBalance(report:{calibration:Suite;validation:Suite;edges:Bounds;allPairs:Bounds}){
 for(const name of ["calibration","validation","edges","allPairs"] as const){
  const suite=report[name];
  assert.ok(Number.isInteger(suite.battles)&&suite.battles>0,`${name}: 沒有對戰樣本`);
  assert.ok(Number.isFinite(suite.minSeconds)&&Number.isFinite(suite.maxSeconds)&&suite.minSeconds>=15&&suite.maxSeconds<=40&&suite.minSeconds<=suite.maxSeconds&&suite.outsideTarget===0,`${name}: 對決必須在15–40秒內`);
 }
 for(const [name,suite] of [['calibration',report.calibration],['validation',report.validation]] as const){
  for(const type of ['attack','defense','stamina','balance']){
   const t=suite.types[type];assert.ok(t&&t.played>0,`${name}/${type}: 缺少樣本`);
   const rate=t.wins/t.played*100;assert.ok(rate>=40&&rate<=60,`${name}/${type}: ${rate}% 不在40–60%`);
  }
  const f=suite.finishes;
  assert.equal(Object.values(f).reduce((n,v)=>n+v,0),suite.battles,`${name}: 終結計數不一致`);
  assert.ok(f.spin/suite.battles<=.5,`${name}: 停轉仍占多數`);
  for(const [finish,minimum]of [['burst',.1],['over',.1],['extreme',.05]] as const)assert.ok(f[finish]/suite.battles>=minimum,`${name}: ${finish}不足${minimum*100}%`);
  const draws=Object.values(suite.types).reduce((n,t)=>n+t.draws,0)/2;assert.ok(draws/suite.battles<=.05,`${name}: 平手超過5%`);
 }
}
