import type { Finish, Result } from "./physics.ts";
export type Cue = Finish | "draw" | "victory" | "defeat";
export const FINISH_COLORS = { spin: "#b6f55b", burst: "#ffbc56", over: "#68dbff", extreme: "#ff634c", draw: "#b9c9d7" };
export function exitPose(kind: "over" | "extreme", age: number, origin: {x:number;y:number;z:number}, reduced=false) {
  const u = reduced ? 1 : Math.max(0, Math.min(1, age / (kind === "over" ? .95 : .55)));
  const x = kind === "over" ? (origin.x < 0 ? -5.65 : 5.65) : Math.max(-.65, Math.min(.65, origin.x));
  const z = kind === "extreme" ? 5.65 : Math.max(-.5, Math.min(.5, origin.z));
  const tilt = kind === "over" ? 1.15 : .45;
  if (!u) return { ...origin, tilt: 0 };
  if (u === 1) return { x, y: .13, z, tilt };
  const travel = 1 - Math.pow(1 - u, 3);
  return { x: origin.x + (x-origin.x)*travel, z: origin.z + (z-origin.z)*travel,
    y: origin.y + (.13-origin.y)*u + Math.sin(Math.PI*u)*(kind === "over" ? .8 : .24), tilt: tilt*u };
}
export function burstPose(age: number, link: number, floor: number, reduced=false) {
  const u = reduced ? 1 : Math.max(0, Math.min(1, age / 1.25));
  const travel = 1 - Math.pow(1-u, 3), angle = .45 + link * 2.39996;
  const radius = [.82, .65, .48][link] ?? .48;
  return { x: Math.cos(angle)*radius*travel, z: Math.sin(angle)*radius*travel,
    y: Math.sin(Math.PI*u)*(.65-link*.14) - Math.max(0, floor-.025)*travel,
    tilt: Math.sin(Math.PI*u)*.35*(link%2 ? -1 : 1) };
}
export function scorePreview(result: Result, scores: readonly number[]) {
  const next = [...scores];
  if (result.winner !== null) next[result.winner] += result.points;
  return next;
}
export function cueSamples(kind: Cue, rate: number) {
  const duration = kind === "victory" ? 1.45 : kind === "extreme" ? 1.25 : kind === "burst" ? 1.1 : .95;
  const samples = new Float32Array(Math.ceil(duration*rate));
  const notes = kind === "victory" ? [523.25,659.25,783.99,1046.5]
    : kind === "defeat" ? [392,349.23,261.63] : [329.63,311.13];
  let seed = 81731, low = 0;
  for (let i=0; i<samples.length; i++) {
    const t=i/rate;
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1; low += .18*(noise-low);
    let value=0;
    if (kind === "burst") {
      for (let j=0;j<3;j++) { const s=t-j*.075; if(s>=0)
        value += (noise-low)*.5*Math.exp(-s/.035)+Math.sin(2*Math.PI*(1361+j*731)*s)*.23*Math.exp(-s/.14); }
    } else if (kind === "over") {
      if(t<.5) value=(noise-low)*.4*Math.sin(Math.PI*t/.5)+Math.sin(2*Math.PI*(430*t-260*t*t))*.16;
      const s=t-.52; if(s>=0) value+=Math.sin(2*Math.PI*102*s)*.6*Math.exp(-s/.075)+(noise-low)*.3*Math.exp(-s/.012);
    } else if (kind === "extreme") {
      if(t<.43) value=(noise-low)*.45*(t/.43)+Math.sin(2*Math.PI*(120*t+1100*t*t))*.24;
      const s=t-.43; if(s>=0) value+=Math.sin(2*Math.PI*62*s)*.7*Math.exp(-s/.17)+(noise-low)*.6*Math.exp(-s/.035);
    } else if (kind === "spin") {
      value=Math.sin(2*Math.PI*(130*t-48*t*t))*.35*Math.exp(-t/.2);
      const s=t-.5; if(s>=0) value+=Math.sin(2*Math.PI*79*s)*.25*Math.exp(-s/.07);
    } else {
      notes.forEach((freq,j)=>{const s=t-j*.16; if(s>=0)
        value += (Math.sin(2*Math.PI*freq*s)+.22*Math.sin(2*Math.PI*freq*2*s))*.3*Math.min(1,s/.006)*Math.exp(-s/.22);});
      if(kind === "victory" && t>.58) for(const freq of [523.25,659.25,783.99]) {
        const s=t-.58; value+=Math.sin(2*Math.PI*freq*s)*.1*Math.min(1,s/.02)*Math.exp(-s/.35);
      }
    }
    samples[i]=value*Math.min(1,t/.002)*Math.min(1,(duration-t)/.04);
  }
  const peak=samples.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
  for(let i=0;i<samples.length;i++) samples[i]*=.82/peak;
  return samples;
}
