import type{Bey,BeyType}from'./catalog.ts';
import{ratchets}from'./catalog.ts';
import{combatProfile}from'./combat-profiles.ts';
import profiles from'./model-profiles.json'with{type:'json'};
import references from'./model-references.json'with{type:'json'};
import parts from'./part-shapes.json'with{type:'json'};
import type{Battle}from'./physics.ts';
export type EffectMode='attack'|'defense'|'stamina';
export interface BeyEffects{type:BeyType;color:string;spin:number;blades:number;radius:number;pitch:number;trail:number;grip:number;offset:boolean;free:boolean;rubber:boolean;metal:boolean;bound:boolean;teeth:number;dash:{rate:number;width:number;cutoff:number;pulse:number}}
const cache=new WeakMap<Bey,BeyEffects>();
export function beyEffects(b:Bey):BeyEffects{
 const cached=cache.get(b);if(cached)return cached;
 const model=(profiles as Record<string,typeof profiles['bx-01-dran-sword']>)[b.id],ref=(references as Record<string,{colors:{bladePlastic:string|null};top:{teeth:number;primaryColor:string}}>)[b.id],part=(parts as Record<string,{name:string;family:string;offsetTip:boolean;freeRing:boolean;metalTip:boolean;gearTeeth:number|null}>)[b.bit];
 const p=combatProfile(b.id,b.bit,b.height,ratchets[b.ratchet].sides,b.type);
 const rubber=part.family==='rubber'||part.name.includes('Rubber'),free=part.freeRing||model.features.includes('free-ring'),bound=b.bit==='BS',metal=part.metalTip,teeth=part.gearTeeth??12;
 const pitch=1.18-p.mass*.18+(p.contact-1)*.3;
 const result={type:b.type,color:ref.colors.bladePlastic??ref.top.primaryColor??b.color,spin:b.spin==='L'?1:-1,
  blades:Math.max(2,Math.min(8,ref.top.teeth)),radius:.48+p.mass*.08,pitch,
  trail:.17+p.mobility*.14+p.inertia*.035,grip:p.grip,offset:part.offsetTip,free,rubber,metal,bound,teeth,
  dash:{rate:pitch*(rubber?.91:metal?1.12:free?.96:1)*( .94+teeth*.005),width:(rubber?1.42:part.offsetTip?1.18:free?1.1:1)*p.grip,
   cutoff:rubber?1250:metal?3600:free?1800:2600,pulse:part.offsetTip?.35:bound?.22:0}};
 cache.set(b,result);return result;
}
export function effectMode(p:BeyEffects,speed:number,tilt:number):EffectMode{
 return p.type==='balance'?(speed>3||tilt>.18?'attack':'defense'):p.type;
}
// Shared hit events identify neither attacker; derive the visual lead from actual momentum.
export function hitBey(b:Battle){const [a,c]=b.tops;return Math.hypot(a.vx,a.vz)*a.bey.stats.weight>=Math.hypot(c.vx,c.vz)*c.bey.stats.weight?a.bey:c.bey;}
export function effectVertices(p:BeyEffects,mode:EffectMode,time:number,hit:number,out:Float32Array,dash=0){
 const phase=-time*p.spin*(mode==='stamina'?.8:2),radius=p.radius+(mode==='defense'?hit*.12:0);
 for(let i=0;i<72;i++)for(let j=0;j<2;j++){
  const t=(i+j)/72,band=mode==='stamina'?Math.min(1,Math.floor(i/36)):0;
  let a=phase+t*Math.PI*2,r=radius+dash*(p.rubber?.14:p.free?.09:.06),y=0;
  if(mode==='attack'){
   const blade=Math.floor(i/(72/p.blades)),u=(i%(72/p.blades)+j)/(72/p.blades);
   a=phase+blade*Math.PI*2/p.blades+u*.8*p.spin;r+=u*.16;y=u*.025;
  }else if(mode==='defense'){
   const sides=Math.max(6,p.blades),sector=Math.PI*2/sides,local=((a%sector)+sector)%sector-sector/2;r*=Math.cos(sector/2)/Math.cos(local);
  }else{a=phase+(i%36+j)/36*Math.PI*2;r+=band*.065;y=band*.025;}
  if(dash>0)r+=Math.sin(a*p.blades-time*p.spin*12)*dash*p.dash.pulse*.08;
  if(p.bound)y+=Math.abs(Math.sin(a*2+time*9))*hit*.055;
  if(p.offset)r+=Math.sin(a*3+time*8)*.025;
  if(p.free&&band===1)a-=phase*1.7;
  const at=(i*2+j)*3;out[at]=Math.cos(a)*r;out[at+1]=y;out[at+2]=Math.sin(a)*r;
 }
 return 144;
}

export function collisionAccent(p:BeyEffects,opposed:boolean){
 return {curl:p.spin*(opposed?9:3)*(p.free?1.5:1),spread:p.rubber?1.4:p.metal?.85:1,
  lift:p.bound?1.8:p.offset?1.2:p.type==='defense'?.35:.7,decay:p.free?1.25:p.rubber?.85:1};
}

export function beySignature(b:Bey){
 const p=beyEffects(b);return p.rubber?'橡膠抓地':p.offset?'偏心脈動':p.free?'自由環':p.bound?'彈簧回彈':p.metal?'金屬軸':p.type==='attack'?'掃刃追擊':p.type==='defense'?'護環反擊':p.type==='stamina'?'穩定氣流':'攻守切換';
}
export function finishAccent(p:BeyEffects,kind:string,age:number,reduced=false){
 const duration=kind==='burst'?1.25:kind==='over'?.95:.55,u=Math.max(0,Math.min(1,age/duration)),wave=u===0||u===1||reduced?0:Math.sin(Math.PI*u);
 return {angle:wave?p.spin*wave*(p.free?.48:p.rubber?.2:p.offset?.38:.28):0,bounce:wave*(p.bound?.08:p.offset?.035:0),glow:reduced?0:Math.max(0,1-age/1.5)};
}
