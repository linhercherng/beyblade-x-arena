import type{Bey,BeyType}from'./catalog.ts';
import{ratchets}from'./catalog.ts';
import{combatProfile}from'./combat-profiles.ts';
import profiles from'./model-profiles.json'with{type:'json'};
import references from'./model-references.json'with{type:'json'};
import parts from'./part-shapes.json'with{type:'json'};
import type{Battle}from'./physics.ts';
export type EffectMode='attack'|'defense'|'stamina';
export interface BeyEffects{type:BeyType;color:string;spin:number;blades:number;radius:number;pitch:number;trail:number;grip:number;offset:boolean;free:boolean;rubber:boolean}
const cache=new WeakMap<Bey,BeyEffects>();
export function beyEffects(b:Bey):BeyEffects{
 const cached=cache.get(b);if(cached)return cached;
 const model=(profiles as Record<string,typeof profiles['bx-01-dran-sword']>)[b.id],ref=(references as Record<string,{colors:{bladePlastic:string|null};top:{teeth:number;primaryColor:string}}>)[b.id],part=(parts as Record<string,{name:string;family:string;offsetTip:boolean;freeRing:boolean}>)[b.bit];
 const p=combatProfile(b.id,b.bit,b.height,ratchets[b.ratchet].sides,b.type);
 const result={type:b.type,color:ref.colors.bladePlastic??ref.top.primaryColor??b.color,spin:b.spin==='L'?1:-1,
  blades:Math.max(2,Math.min(8,ref.top.teeth)),radius:.48+p.mass*.08,pitch:1.18-p.mass*.18+(p.contact-1)*.3,
  trail:.17+p.mobility*.14+p.inertia*.035,grip:p.grip,offset:part.offsetTip,free:part.freeRing||model.features.includes('free-ring'),rubber:part.family==='rubber'||part.name.includes('Rubber')};
 cache.set(b,result);return result;
}
export function effectMode(p:BeyEffects,speed:number,tilt:number):EffectMode{
 return p.type==='balance'?(speed>3||tilt>.18?'attack':'defense'):p.type;
}
// Shared hit events identify neither attacker; derive the visual lead from actual momentum.
export function hitBey(b:Battle){const [a,c]=b.tops;return Math.hypot(a.vx,a.vz)*a.bey.stats.weight>=Math.hypot(c.vx,c.vz)*c.bey.stats.weight?a.bey:c.bey;}
export function effectVertices(p:BeyEffects,mode:EffectMode,time:number,hit:number,out:Float32Array){
 const phase=time*p.spin*(mode==='stamina'?.8:2),radius=p.radius+(mode==='defense'?hit*.12:0);
 for(let i=0;i<72;i++)for(let j=0;j<2;j++){
  const t=(i+j)/72,band=mode==='stamina'?Math.min(1,Math.floor(i/36)):0;
  let a=phase+t*Math.PI*2,r=radius,y=0;
  if(mode==='attack'){
   const blade=Math.floor(i/(72/p.blades)),u=(i%(72/p.blades)+j)/(72/p.blades);
   a=phase+blade*Math.PI*2/p.blades+u*.8*p.spin;r+=u*.16;y=u*.025;
  }else if(mode==='defense'){
   const sides=Math.max(6,p.blades),sector=Math.PI*2/sides,local=((a%sector)+sector)%sector-sector/2;r*=Math.cos(sector/2)/Math.cos(local);
  }else{a=phase+(i%36+j)/36*Math.PI*2;r+=band*.065;y=band*.025;}
  if(p.offset)r+=Math.sin(a*3+time*8)*.025;
  if(p.free&&band===1)a-=phase*1.7;
  const at=(i*2+j)*3;out[at]=Math.cos(a)*r;out[at+1]=y;out[at+2]=Math.sin(a)*r;
 }
 return 144;
}
