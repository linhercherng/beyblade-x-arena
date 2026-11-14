const smooth = (x: number) => { const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t); };
export function dashVisual(age: number, reduced = false) {
  if(reduced || !Number.isFinite(age) || age<0)return {latch:0,intensity:0,lean:0};
  const intensity=smooth(age/.035)*(1-smooth((age-.38)/.36));
  return {latch:smooth(age/.025)*(1-smooth((age-.035)/.085)),intensity,lean:intensity*.13};
}
export function dashSamples(sampleRate: number, grip = true) {
  const duration=.62, samples=new Float32Array(Math.ceil(duration*sampleRate));
  let seed=32417,low=0,peak=0;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;low+=.13*(noise-low);
    const teeth=Math.pow(Math.max(0,Math.sin(2*Math.PI*(45*t+170*t*t))),8);
    const gear=Math.sin(2*Math.PI*2140*t)*teeth*Math.exp(-t/.10);
    const sweep=Math.sin(2*Math.PI*(130*t+800*t*t));
    const attack=Math.min(1,t/.002),tail=Math.min(1,(duration-t)/.065);
    samples[i]=attack*tail*Math.exp(-t/.36)*((grip?.55:0)*gear+.34*(noise-low)+.22*sweep);
    peak=Math.max(peak,Math.abs(samples[i]));
  }
  for(let i=0;i<samples.length;i++)samples[i]*=.82/peak;
  return samples;
}
import {GATE_HALF_ANGLES} from "./physics.ts";
export function hasRail(x:number,z:number) {
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)<.01)return false;
  const a=Math.atan2(z,x);
  return ![[0,GATE_HALF_ANGLES.over],[Math.PI,GATE_HALF_ANGLES.over],[Math.PI/2,GATE_HALF_ANGLES.extreme]].some(([center,half])=>Math.abs(Math.atan2(Math.sin(a-center),Math.cos(a-center)))<half+.018);
}
