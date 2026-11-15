import type{CountdownCue}from'./countdown-voice.ts';
export interface CountdownPlayback{complete:boolean;cancelled:boolean;elapsed?:()=>number}
export class LaunchCountdown{
 cue:CountdownCue|null=3;
 private shown=false;
 private playback:CountdownPlayback|null=null;
 private startedAt=0;
 private entryProgress=0;
 private audioOffset=0;
 private frozenAudio:number|null=null;
 private frozen=false;
 private launched=false;
 private age(time:number){return this.playback?.elapsed?this.playback.elapsed()-this.audioOffset:(time-this.startedAt)/1000;}
 get started(){return !!this.playback&&!this.playback.cancelled&&(!this.playback.elapsed||this.playback.elapsed()>=0);}
 takeLaunch(time:number){if((this.cue!==0&&this.cue!==null)||!this.started||this.launched)return null;this.launched=true;return Math.max(0,this.age(time));}
 step(time:number,play:(cue:CountdownCue)=>CountdownPlayback|null):'show'|'done'|null{
  if(this.cue===null)return null;
  // Give the browser a painted frame before starting the matching word.
  if(!this.shown){this.shown=true;return'show';}
  if(this.playback?.cancelled)this.playback=null;
  if(!this.playback){this.playback=play(this.cue);if(this.playback){this.startedAt=time;this.audioOffset=0;}return null;}
  if(!this.playback.complete||this.age(time)<(this.cue===0?0:1))return null;
  if(this.cue===0){this.cue=null;return'done';}
  this.cue=(this.cue-1)as CountdownCue;this.playback=null;return'show';
 }
 freeze(time:number){this.progress(time);this.frozenAudio=this.playback?.elapsed?.()??null;this.frozen=true;}
 shift(milliseconds:number){
  this.startedAt+=milliseconds;
  if(this.frozenAudio!==null&&this.playback?.elapsed)this.audioOffset+=Math.max(0,this.playback.elapsed()-this.frozenAudio);
  this.frozenAudio=null;this.frozen=false;
 }
 progress(time:number){
  if(this.frozen||this.playback?.cancelled)return this.entryProgress;
  this.entryProgress=Math.max(this.entryProgress,this.cue===null?3:3-this.cue+(this.playback?Math.max(0,Math.min(1,this.age(time))):0));return this.entryProgress;
 }
}
