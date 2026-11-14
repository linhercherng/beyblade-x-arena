import type{CountdownCue}from'./countdown-voice.ts';
export interface CountdownPlayback{complete:boolean;cancelled:boolean}
export class LaunchCountdown{
 cue:CountdownCue|null=3;
 private shown=false;
 private playback:CountdownPlayback|null=null;
 private startedAt=0;
 private entryProgress=0;
 get started(){return !!this.playback&&!this.playback.cancelled;}
 step(time:number,play:(cue:CountdownCue)=>CountdownPlayback|null):'show'|'done'|null{
  if(this.cue===null)return null;
  // Give the browser a painted frame before starting the matching word.
  if(!this.shown){this.shown=true;return'show';}
  if(this.playback?.cancelled)this.playback=null;
  if(!this.playback){this.playback=play(this.cue);if(this.playback)this.startedAt=time;return null;}
  if(!this.playback.complete||time-this.startedAt<(this.cue===0?0:1000))return null;
  if(this.cue===0){this.cue=null;return'done';}
  this.cue=(this.cue-1)as CountdownCue;this.playback=null;return'show';
 }
 shift(milliseconds:number){this.startedAt+=milliseconds;}
 progress(time:number){this.entryProgress=Math.max(this.entryProgress,this.cue===null?3:3-this.cue+(this.playback?Math.max(0,Math.min(1,(time-this.startedAt)/1000)):0));return this.entryProgress;}
}
