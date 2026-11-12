import type {Battle,BattleEvent,Top} from "./physics.ts";
export const HIGHLIGHT_CAPACITY=92;
export const HIGHLIGHT_RATE=.55;
const FIELDS=["x","z","vx","vz","rpm","tilt","rotation","dashUntil"] as const;
type Pose=Pick<Top,typeof FIELDS[number]>;
type Frame={time:number;tops:[Pose,Pose]};
const pose=(top:Top|Pose)=>Object.fromEntries(FIELDS.map(k=>[k,top[k]])) as Pose;
export class HighlightRecorder {
  private frames:Frame[]=[];
  private next=0;
  private events:BattleEvent[]=[];
  private eventTick=-1;
  get size(){return this.frames.length;}
  reset(){this.frames=[];this.next=0;this.events=[];this.eventTick=-1;}
  record(b:Battle){
    if(this.eventTick!==b.tick){
      for(const e of b.events)if(e.type==="hit"||e.type==="dash")this.events.push({...e});
      this.eventTick=b.tick;
      while(this.events.length>128 || (this.events[0]&&this.events[0].time<b.time-3))this.events.shift();
    }
    const last=this.frames[(this.next-1+HIGHLIGHT_CAPACITY)%HIGHLIGHT_CAPACITY];
    if(last&&last.time===b.time)return;
    if(last&&b.time-last.time<1/30-1e-8&&!b.result)return;
    const frame=this.frames[this.next]??{time:0,tops:[pose(b.tops[0]),pose(b.tops[1])]};
    frame.time=b.time;
    b.tops.forEach((t,i)=>{for(const k of FIELDS)frame.tops[i][k]=t[k];});
    this.frames[this.next]=frame;this.next=(this.next+1)%HIGHLIGHT_CAPACITY;
  }
  clip(b:Battle){
    if(!b.result||b.result.winner===null||b.result.finish==="spin"||this.size<2)return null;
    const ordered=this.size<HIGHLIGHT_CAPACITY?this.frames:[...this.frames.slice(this.next),...this.frames.slice(0,this.next)];
    const start=Math.max(ordered[0].time,b.time-2.5);
    if(b.time<=start)return null;
    const frames=ordered.filter(f=>f.time>=start-1/30-1e-8).map(f=>({time:f.time,tops:f.tops.map(p=>({...p})) as [Pose,Pose]}));
    return new HighlightReplay(b,frames,this.events.filter(e=>e.time>=start).map(e=>({...e})),start);
  }
}
export class HighlightReplay {
  age=0;
  readonly battle:Battle;
  readonly leadSeconds:number;
  readonly duration:number;
  private eventCursor=0;
  private frameCursor=0;
  get eventCount(){return this.events.length;}
  private frames:Frame[];
  private events:BattleEvent[];
  private start:number;
  constructor(source:Battle,frames:Frame[],events:BattleEvent[],start:number){
    this.frames=frames;this.events=events;this.start=start;
    this.battle={...source,tops:source.tops.map(t=>({...t})) as [Top,Top],result:null,events:[],shouts:[[],[]]};
    this.result={...source.result!};this.end=source.time;
    this.leadSeconds=(this.end-start)/HIGHLIGHT_RATE;this.duration=this.leadSeconds+1.65/HIGHLIGHT_RATE;
  }
  private result:NonNullable<Battle["result"]>;
  private end:number;
  advance(dt:number){
    this.age=Math.min(this.duration,this.age+Math.max(0,Number.isFinite(dt)?dt:0));
    const time=Math.min(this.end,this.start+this.age*HIGHLIGHT_RATE);
    while(this.frameCursor<this.frames.length-2&&this.frames[this.frameCursor+1].time<time)this.frameCursor++;
    const a=this.frames[this.frameCursor],b=this.frames[Math.min(this.frameCursor+1,this.frames.length-1)],alpha=Math.max(0,Math.min(1,(time-a.time)/Math.max(1e-8,b.time-a.time)));
    this.battle.time=time;
    this.battle.tops.forEach((t,i)=>{for(const k of FIELDS)t[k]=a.tops[i][k]+(b.tops[i][k]-a.tops[i][k])*alpha;});
    const events:BattleEvent[]=[];
    while(this.eventCursor<this.events.length&&this.events[this.eventCursor].time<=time)events.push(this.events[this.eventCursor++]);
    const phase=this.age>=this.leadSeconds?"finish":"approach";
    this.battle.result=phase==="finish"?this.result:null;
    return{battle:this.battle,phase,events,progress:this.age/this.duration,done:this.age>=this.duration};
  }
}
