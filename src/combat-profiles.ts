import profiles from "./model-profiles.json" with {type:"json"};
import references from "./model-references.json" with {type:"json"};
import parts from "./part-shapes.json" with {type:"json"};
import type {BeyType, Stats} from "./catalog.ts";

export const TRAIT_VERSION=1;
export const TRAIT_NOTE="照片輪廓與零件族群推導的遊戲估值，非實測重量、慣量或摩擦係數。";
export interface CombatProfile {
  mass:number; inertia:number; balance:number; contact:number; mobility:number;
  grip:number; friction:number; lock:number; source:string; bitSource:string;
}
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
// 只取幾何比例與零件結構，不以名稱或ID雜湊決定強弱。
export function combatProfile(id:string,bit:string,height:number,sides:number,type:BeyType):CombatProfile {
  const p=(profiles as Record<string,typeof profiles["bx-01-dran-sword"]>)[id];
  const ref=(references as Record<string,{top:{shape:number[]}}>)[id];
  const part=(parts as Record<string,{family:string;offsetTip:boolean;freeRing:boolean;source:string}>)[bit];
  if(!p||!ref||!part)throw new Error(`缺少戰鬥特性來源：${id}/${bit}`);
  const shape=ref.top.shape, mean=shape.reduce((n,r)=>n+r,0)/shape.length;
  const variance=Math.sqrt(shape.reduce((n,r)=>n+(r-mean)**2,0)/shape.length);
  const flat=["flat","rubber","quake"].includes(part.family);
  const mobility=flat?1:part.family==="taper"||part.family==="point"?.63:part.family==="ball"?.2:.16;
  const mass=clamp(({attack:1.18,defense:1.32,stamina:1.06,balance:1.13}[type])+(mean-.9)*.8+(p.bladeThickness-.1)*1.5,.8,1.5);
  return {
    mass, inertia:clamp(.92+(mean-.88)*1.1+(p.bladeThickness-.1)*.7,.85,1.15),
    balance:clamp(1-variance*2-(height-60)*.0025-p.coreRise*.2,.72,1),
    contact:clamp(.94+variance*1.1+(p.shoulderDrop-.025)*.8,.9,1.12),
    mobility:clamp(mobility+(p.tipRadius-.06)*1.3,.12,1.12),
    grip:clamp(.94+(p.gearRadius-.08)*2+(bit.startsWith("G")?.06:0),.85,1.12),
    friction:clamp(1+(p.tipRadius-.06)*.4+(part.offsetTip?.04:0)-(part.freeRing?.02:0),.96,1.06),
    lock:clamp(1+(70-height)*.002-(sides-4)*.009,.88,1.1),
    source:p.source,bitSource:part.source,
  };
}
export function profileStats(p:CombatProfile,type:BeyType,dash:number,burst:number):Stats {
  const base={attack:[84,59,80],defense:[58,84,72],stamina:[56,58,84],balance:[72,70,74]}[type];
  const score=(n:number)=>Math.round(clamp(n,1,100));
  return {atk:score(base[0]*p.contact),def:score(base[1]*(.96+p.balance*.04)),sta:score(base[2]*(.97+p.inertia*.03)),
    dash:score(dash*p.grip),burst:score(burst*p.lock),weight:score(p.mass*70)};
}
