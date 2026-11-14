import clips from './countdown-voice-data.json' with {type:'json'};
export type CountdownCue=0|1|2|3;
export const COUNTDOWN_RATE=16000;
export function countdownSamples(cue:CountdownCue){
 const bytes=Uint8Array.from(atob(clips[cue]),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),samples=new Float32Array(bytes.length/2);
 for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
 return samples;
}
