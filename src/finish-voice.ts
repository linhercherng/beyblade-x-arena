import clips from './finish-voice-data.json' with {type:'json'};
import{pcmSamples}from'./countdown-voice.ts';
export type FinishVoiceCue=keyof typeof clips;
export const FINISH_VOICE_CUES=Object.keys(clips)as FinishVoiceCue[];
export function finishSamples(cue:FinishVoiceCue){return pcmSamples(clips[cue]);}
