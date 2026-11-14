import clips from './countdown-voice-data.json' with {type:'json'};
export type CountdownCue=0|1|2|3;
export const COUNTDOWN_RATE=16000;
export function countdownSamples(cue:CountdownCue){
 const bytes=Uint8Array.from(atob(clips[cue]),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),samples=new Float32Array(bytes.length/2);
 for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
 return samples;
}

export function launchSamples(go:boolean,sampleRate:number){
 const duration=go?.36:.12,samples=new Float32Array(Math.round(sampleRate*duration));let seed=go?4261:1367;
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/4294967296*2-1,phase=2*Math.PI*((go?105:420)*t+(go?-75:380)*t*t);
  const envelope=Math.min(1,t/.004)*Math.exp(-t/(go?.09:.032))*(1-t/duration);
  samples[i]=(.65*Math.sin(phase)+.25*noise+.1*Math.sin(phase*3.7))*.72*envelope;
 }
 return samples;
}
