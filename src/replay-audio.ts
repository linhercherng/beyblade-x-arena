export type ReplayStage="tracking"|"impact"|"decision"|"finish";
const MIX={
  tracking:{gain:.68,cutoff:14000,seconds:.12},
  impact:{gain:.24,cutoff:1000,seconds:.012},
  decision:{gain:.18,cutoff:700,seconds:.012},
  finish:{gain:.55,cutoff:16000,seconds:.08},
  normal:{gain:1,cutoff:22000,seconds:.08},
};
export const replayMix=(stage:ReplayStage|null)=>MIX[stage??"normal"];
export function replayAccentSamples(kind:"impact"|"decision",rate:number){
  const decision=kind==="decision",duration=decision?.4:.28,samples=new Float32Array(Math.ceil(duration*rate));
  let seed=decision?76123:17093,low=0,peak=0;
  for(let i=0;i<samples.length;i++){
    const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;low+=.12*(noise-low);
    const body=Math.sin(2*Math.PI*((decision?52:76)*t+70*.022*(1-Math.exp(-t/.022))));
    const metal=Math.sin(2*Math.PI*(decision?1460:1830)*t)+.4*Math.sin(2*Math.PI*2790*t);
    const envelope=Math.min(1,t/.0015)*Math.min(1,(duration-t)/.025);
    samples[i]=envelope*(body*.62*Math.exp(-t/(decision?.095:.055))+metal*.21*Math.exp(-t/.055)+(noise-low)*.38*Math.exp(-t/.018));
    peak=Math.max(peak,Math.abs(samples[i]));
  }
  for(let i=0;i<samples.length;i++)samples[i]*=.78/peak;
  return samples;
}
