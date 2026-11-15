import clips from './countdown-voice-data.json' with {type:'json'};
export type CountdownCue=0|1|2|3;
export const COUNTDOWN_RATE=16000;
export function countdownSamples(cue:CountdownCue){return pcmSamples(clips[cue]);}
export function pcmSamples(encoded:string){
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),samples=new Float32Array(bytes.length/2);
 for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
 return samples;
}

export function launchSamples(go:boolean,sampleRate:number){
 const duration=go?.36:.12,samples=new Float32Array(Math.round(sampleRate*duration));let seed=go?4261:1367,low=0;
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/4294967296*2-1;low+=.12*(noise-low);
  const teeth=Math.pow(Math.max(0,Math.sin(2*Math.PI*(go?95:155)*t)),8);
  const click=(noise-low)*teeth*Math.exp(-t/(go?.055:.025));
  const body=Math.sin(2*Math.PI*((go?85:430)*t+(go?-45:220)*t*t))*Math.exp(-t/(go?.075:.025));
  const air=(noise-low)*Math.min(1,t/.045)*Math.exp(-t/.10);
  const envelope=Math.min(1,t/.002)*Math.min(1,(duration-t)/.025);
  samples[i]=envelope*(body*.40+click*.23+(go?air*.24:0));
 }
 return samples;
}
export function openingSamples(cue:CountdownCue,sampleRate:number){
 const base=launchSamples(cue===0,sampleRate);if(cue!==1)return base;
 const samples=new Float32Array(Math.round(sampleRate*.72));samples.set(base);
 for(let i=Math.round(sampleRate*.45);i<samples.length;i++){
  const t=i/sampleRate-.45,tail=Math.min(1,(samples.length-i)/sampleRate/.025);
  samples[i]=Math.min(1,t/.003)*tail*Math.exp(-t/.055)*(.34*Math.sin(2*Math.PI*(90*t-45*t*t))+.13*Math.sin(2*Math.PI*650*t)*Math.exp(-t/.012));
 }
 return samples;
}
