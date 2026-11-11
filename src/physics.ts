import type { Bey } from './catalog.ts';
export const DT=1/120;
export const RADIUS=4.25;
export const TOP_RADIUS=.39;
export const FINISH={spin:{label:'旋轉終結',en:'SPIN FINISH',points:1},over:{label:'越界終結',en:'OVER FINISH',points:2},burst:{label:'爆裂終結',en:'BURST FINISH',points:2},extreme:{label:'極限終結',en:'XTREME FINISH',points:3}};
export type Finish=keyof typeof FINISH;
export interface Launch { power:number; lane:number; angle:number }
export interface Top {
  bey:Bey; x:number; z:number; vx:number; vz:number; rpm:number; burst:number; tilt:number;
  dashUntil:number; railCooldown:number; boostUntil:number; shouted:boolean;
  hitUntil:number;
  impulse:number; maxImpulse:number; dashes:number; rotation:number;
}
export interface Result { winner:0|1|null; finish:Finish; points:number; time:number }
export interface BattleEvent { type:'hit'|'dash'|'finish'|'shout'; x:number; z:number; strength:number; player:number; time:number }
export interface Battle { tops:[Top,Top]; time:number; tick:number; seed:number; result:Result|null; events:BattleEvent[]; contactCooldown:number; shouts:[number[],number[]] }
export function rng(seed:number) { let n=seed>>>0; return ()=>{ n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }; }
export function createBattle(a:Bey,b:Bey,inputs:readonly Launch[],seed:number):Battle {
  const random=rng(seed);
  const tops=[a,b].map((bey,i)=>{
    const input=inputs[i];
    if(!input || !Number.isFinite(input.power)||input.power<.4||input.power>1||!Number.isInteger(input.lane)||input.lane<0||input.lane>2||!Number.isFinite(input.angle)||input.angle<0||input.angle>30) throw new Error('發射輸入不合法');
    const theta=(i?Math.PI:0)+.3+(random()-.5)*.2;
    const r=[1.0,2.4,3.5][input.lane];
    const orbit=bey.type==='attack'?3.8:bey.type==='balance'?2.6:1.15;
    const speed=orbit*(.8+input.angle/45)*input.power;
    const spin=bey.spin==='L'?-1:1;
    return {bey,x:Math.cos(theta)*r,z:Math.sin(theta)*r,vx:-Math.sin(theta)*speed*spin-Math.cos(theta)*.6,vz:Math.cos(theta)*speed*spin-Math.sin(theta)*.6,rpm:input.power,burst:bey.stats.burst,tilt:0,dashUntil:0,railCooldown:1.3,boostUntil:0,hitUntil:0,shouted:false,impulse:0,maxImpulse:0,dashes:0,rotation:0};
  }) as [Top,Top];
  return {tops,time:0,tick:0,seed,result:null,events:[],contactCooldown:0,shouts:[[],[]]};
}
export function finishFor(t:Pick<Top,'rpm'|'burst'|'x'|'z'>):Finish|null {
  if(Math.hypot(t.x,t.z)>RADIUS+.18) return t.z>3.8 && Math.abs(t.x)<1.3?'extreme':'over';
  if(t.burst<=0) return 'burst';
  if(t.rpm<=0) return 'spin';
  return null;
}
export function shout(s:Battle,player:0|1) {
  const t=s.tops[player];
  if(t.shouted||s.result) return false;
  t.shouted=true;t.boostUntil=s.time+2;s.shouts[player].push(s.tick);
  s.events.push({type:'shout',x:t.x,z:t.z,strength:1,player,time:s.time});return true;
}
export function stepBattle(s:Battle) {
  if(s.result) return;
  s.tick++; s.time=s.tick*DT; s.events=[];
  for(const [i,t] of s.tops.entries()) {
    const r=Math.max(.01,Math.hypot(t.x,t.z));
    const spin=t.bey.spin==='L'?-1:1;
    t.tilt=Math.max(t.tilt-DT*.18,0,(.3-t.rpm)/.3);
    const moving=t.bey.type==='attack'||(t.bey.type==='balance'&&t.tilt>.15);
    const target=moving?.2+3.5*(.5+.5*Math.sin(s.time*1.7+i*1.9)):(t.bey.type==='stamina'?.45:.25);
    const rv=(t.vx*t.x+t.vz*t.z)/r;
    const tv=(-t.vx*t.z+t.vz*t.x)/r;
    const radial=(target-r)*4.5-rv*1.8-Math.min(25,tv*tv/r)*.8;
    const tangent=((moving?4.5:.7)*Math.max(.15,t.rpm)*spin-tv)*1.8;
    const wobble=Math.sin(s.time*19+i*2)*t.tilt*.8;
    const steering=s.time<t.hitUntil||s.time<t.dashUntil?.07:1;
    t.vx+=(radial*t.x/r-tangent*t.z/r+wobble)*DT*steering;
    t.vz+=(radial*t.z/r+tangent*t.x/r-wobble)*DT*steering;
    const drag=Math.exp(-(s.time<t.dashUntil?.08:.6)*DT);
    t.vx*=drag;t.vz*=drag;
    const cap=s.time<t.dashUntil?13:7.5;
    const speed=Math.hypot(t.vx,t.vz);
    if(speed>cap){t.vx*=cap/speed;t.vz*=cap/speed;}
    t.x+=t.vx*DT;t.z+=t.vz*DT;
    const endurance=.048-t.bey.stats.sta*.00027;
    t.rpm=Math.max(0,t.rpm-DT*(endurance+speed*.0007+t.tilt*.011));
    t.rotation+=spin*t.rpm*DT*65;
    const newR=Math.hypot(t.x,t.z);
    if(newR>3.48 && s.time>t.railCooldown && t.rpm>.24 && speed>1.7) {
      // 齒軌接觸門檻由衝刺值與兩秒氣勢降低，不以亂數決定勝負。
      const tangential=Math.abs((-t.z*t.vx+t.x*t.vz)/newR);
      if(tangential>3.6-t.bey.stats.dash*.018-(s.time<t.boostUntil?1.5:0)) {
        const opponent=s.tops[1-i],aimX=opponent.x-t.x,aimZ=opponent.z-t.z,aim=Math.hypot(aimX,aimZ);
        t.vx=aimX/Math.max(.1,aim)*(7+t.bey.stats.dash*.04);
        t.vz=aimZ/Math.max(.1,aim)*(7+t.bey.stats.dash*.04);
        t.dashUntil=s.time+.65;t.railCooldown=s.time+2.8;t.dashes++;
        t.rpm=Math.max(0,t.rpm-.015);
        s.events.push({type:'dash',x:t.x,z:t.z,strength:1,player:i,time:s.time});
      }
    }
    if(newR>RADIUS-TOP_RADIUS*.4) {
      const sidePocket=Math.abs(t.z)<.6 && Math.abs(t.x)>3.8;
      const extremePocket=t.z>3.8 && Math.abs(t.x)<.78;
      if(!sidePocket&&!extremePocket) {
        const nx=t.x/newR,nz=t.z/newR, outward=t.vx*nx+t.vz*nz;
        if(outward>0){t.vx-=1.65*outward*nx;t.vz-=1.65*outward*nz;t.rpm=Math.max(0,t.rpm-.001);}
        t.x=nx*(RADIUS-TOP_RADIUS*.4);t.z=nz*(RADIUS-TOP_RADIUS*.4);
      }
    }
  }
  const [a,b]=s.tops;
  const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
  if(d<TOP_RADIUS*2) {
    const nx=d>.0001?dx/d:1,nz=d>.0001?dz/d:0;
    const overlap=TOP_RADIUS*2-d;
    const ma=a.bey.stats.weight/70,mb=b.bey.stats.weight/70;
    a.x-=nx*overlap*mb/(ma+mb);a.z-=nz*overlap*mb/(ma+mb);
    b.x+=nx*overlap*ma/(ma+mb);b.z+=nz*overlap*ma/(ma+mb);
    const rel=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;
    if(rel>0 && s.time>s.contactCooldown) {
      s.contactCooldown=s.time+.06;
      const j=rel*(2*ma*mb/(ma+mb));
      for(const [attacker,defender,sign,mass] of [[a,b,1,mb],[b,a,-1,ma]] as const) {
        const upper=attacker.bey.height<=60&&defender.bey.height>=80?1.15:1;
        const hit=j*Math.max(.3,1+(attacker.bey.stats.atk-defender.bey.stats.def)/100)*upper;
        defender.vx+=sign*hit*nx/mass;defender.vz+=sign*hit*nz/mass;
        defender.hitUntil=s.time+.65;defender.tilt=Math.min(1,defender.tilt+hit/35);
        defender.rpm=Math.max(0,defender.rpm-hit*.004);
        const impact=hit/(1+defender.bey.stats.def/100);
        if(impact>2.5) defender.burst-= (impact-2.5)*2.8*(s.time<attacker.dashUntil?2:1);
        attacker.impulse+=hit;attacker.maxImpulse=Math.max(attacker.maxImpulse,hit);
      }
      if(a.bey.spin!==b.bey.spin) {
        const transfer=Math.min(.012,Math.abs(a.rpm-b.rpm)*.1);
        if(a.rpm<b.rpm){a.rpm+=transfer;b.rpm-=transfer;}else{b.rpm+=transfer;a.rpm-=transfer;}
      }
      s.events.push({type:'hit',x:(a.x+b.x)/2,z:(a.z+b.z)/2,strength:j,player:0,time:s.time});
    }
  }
  const fa=finishFor(a),fb=finishFor(b);
  if(fa||fb) {
    const winner=fa&&fb?null:fa?1:0;
    const finish=fa??fb!;
    s.result={winner,finish,points:winner===null?0:FINISH[finish].points,time:s.time};
    s.events.push({type:'finish',x:fa?a.x:b.x,z:fa?a.z:b.z,strength:4,player:fa?0:1,time:s.time});
  }
}
