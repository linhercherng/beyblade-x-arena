import type { MusicMode } from "./music-state.ts";
import { TOP_RADIUS, type Battle, type BattleEvent } from "./physics.ts";

export function contactFeedback(e:BattleEvent,b?:Battle){
  if(!b||b.result||e.type!=='hit')return null;
  const [a,c]=b.tops,dx=c.x-a.x,dz=c.z-a.z,d=Math.hypot(dx,dz),nx=d>.0001?dx/d:1,nz=d>.0001?dz/d:0;
  const vx=a.vx-c.vx,vz=a.vz-c.vz,strength=Number.isFinite(e.strength)?Math.max(0,e.strength):0;
  const normal=strength*(a.bey.stats.weight+c.bey.stats.weight)*70/(2*a.bey.stats.weight*c.bey.stats.weight),tangent=-vx*nz+vz*nx;
  const headOn=normal/Math.max(.001,Math.hypot(normal,tangent)),power=Math.sqrt(Math.min(14,strength)/14);
  // Facing rims shear for equal spin; opposite spin can roll at similar RPM.
  const rim=TOP_RADIUS*65,shear=Math.max(-1,Math.min(1,(tangent+rim*((a.bey.spin==='R'?a.rpm:-a.rpm)+(c.bey.spin==='R'?c.rpm:-c.rpm)))/(2*rim)));
  return {nx,nz,headOn,shear,weight:.35+.65*headOn,
    kicks:b.tops.map(t=>Math.min(.18,power*(.025+.13*headOn)*Math.max(.7,Math.min(1.3,70/t.bey.stats.weight))*(1.15-.45*t.rpm))),
    spins:b.tops.map(t=>t.bey.spin==='L'?1:-1)};
}
export function contactRecoil(hit:ReturnType<typeof contactFeedback>,player:number,age:number,reduced=false){
  if(!hit||reduced||!Number.isFinite(age)||age<=0||age>=.45)return{x:0,z:0};
  const wave=Math.sin(age*32)*Math.exp(-age*12)*(1-age/.45),angle=hit.spins[player]*age*10+hit.shear*.18;
  const sign=player===0?-1:1,push=hit.kicks[player]*wave*sign,c=Math.cos(angle),s=Math.sin(angle);
  return{x:(-hit.nx*s+hit.nz*c)*push,z:-(hit.nx*c+hit.nz*s)*push};
}
export function impactProfile(strength: number) {
  const strengthSafe = Number.isFinite(strength) ? Math.max(0, Math.min(14, strength)) : 0;
  const energy = Math.sqrt(strengthSafe / 14);
  return {
    tier: (strengthSafe < 1 ? 0 : strengthSafe < 6 ? 1 : 2) as 0 | 1 | 2,
    gain: .36 + energy * 1.14,
    sparks: Math.round(4 + energy * 38),
    shake: Math.pow(energy, 1.5) * .007,
    duck: .72 - energy * .48,
  };
}
export function impactSamples(tier: 0 | 1 | 2, sampleRate: number) {
  const duration = [.12, .17, .23][tier];
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 9017 + tier, low = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += .2 * (noise - low);
    const bodyPhase = 2 * Math.PI * (65 * t + (105 + tier * 20) * .018 * (1 - Math.exp(-t / .018)));
    const metal = Math.sin(2 * Math.PI * (1780 - tier * 170) * t)
      + .6 * Math.sin(2 * Math.PI * (2879 - tier * 215) * t);
    const attack = Math.min(1, t / .0007);
    const tail = Math.min(1, (duration - t) / .012);
    samples[i] = attack * tail * (
      .46 * Math.sin(bodyPhase) * Math.exp(-t / (.021 + tier * .009))
      + .24 * metal * Math.exp(-t / (.019 + tier * .012))
      + .48 * (noise - low) * Math.exp(-t / (.009 + tier * .003))
    );
  }
  const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  for (let i = 0; i < samples.length; i++) samples[i] *= .84 / peak;
  return samples;
}
export function impactShake(age: number, amplitude: number, reduced: boolean) {
  if (reduced) return { x: 0, y: 0 };
  const envelope = amplitude * Math.exp(-Math.max(0, age) * 20);
  return { x: Math.sin(age * 83) * envelope, y: Math.sin(age * 67) * envelope * .55 };
}
export function musicLevel(volume: number, mode: MusicMode | null) {
  if (!mode) return 0;
  return volume * (["battle", "clutch"].includes(mode) ? .34 : .7);
}
