export const GAME_VERSION='0.43.0';
import type {Sound} from './audio.ts';
export const DEVICE_CASES={bluetooth:'藍牙耳機切換',wired:'耳機拔插',call:'來電中斷後恢復',background:'背景／鎖屏後恢復',heat:'連玩15分鐘後發熱／降速'} as const;
type Status='untested'|'pass'|'fail';
export type GpuSample={geometries:number;textures:number;programs:number;drawCalls:number;triangles:number;pixels:number};
export class DeviceCheck{
  private started:number|null=null;
  private ended:number|null=null;
  private last:number|null=null;
  private bins=new Uint32Array(1001);
  private windows:{atMs:number;fps:number|null}[]=[];
  private windowAt=0;private windowFrames=0;private windowMs=0;
  private frames=0;
  private activeMs=0;
  private maxFrameMs=0;
  private gpu:GpuSample|null=null;
  private peakGpu:GpuSample|null=null;
  private heapBytes:number|null=null;
  private peakHeapBytes:number|null=null;
  checks=Object.fromEntries(Object.keys(DEVICE_CASES).map(k=>[k,'untested'])) as Record<keyof typeof DEVICE_CASES,Status>;
  get running(){return this.started!==null&&this.ended===null;}
  start(now:number){
    this.windows=[];this.windowAt=now;this.windowFrames=this.windowMs=0;
    this.started=now;this.ended=null;this.last=null;this.bins.fill(0);this.frames=this.activeMs=this.maxFrameMs=0;
    this.gpu=this.peakGpu=null;this.heapBytes=this.peakHeapBytes=null;
    for(const key of Object.keys(DEVICE_CASES) as (keyof typeof DEVICE_CASES)[])this.checks[key]='untested';
  }
  stop(now:number){if(this.running){this.ended=now;this.last=null;}}
  frame(now:number,active:boolean){
    if(!this.running)return;
    if(!active)this.last=null;
    if(active&&this.last!==null){const ms=now-this.last;if(ms>0){this.frames++;this.activeMs+=ms;this.windowFrames++;this.windowMs+=ms;this.maxFrameMs=Math.max(this.maxFrameMs,ms);this.bins[Math.min(1000,Math.ceil(ms))]++;}}
    this.last=active?now:null;
    if(now-this.windowAt>=60000){this.windows.push({atMs:now-this.started!,fps:this.windowMs?this.windowFrames*1000/this.windowMs:null});if(this.windows.length>30)this.windows.shift();this.windowAt=now;this.windowFrames=this.windowMs=0;}
  }
  sample(gpu:GpuSample|null,heapBytes:number|null){
    if(!this.running)return;
    if(gpu){this.gpu={...gpu};if(!this.peakGpu)this.peakGpu={...gpu};else for(const key of Object.keys(gpu) as (keyof GpuSample)[])this.peakGpu[key]=Math.max(this.peakGpu[key],gpu[key]);}
    this.heapBytes=heapBytes;if(heapBytes!==null)this.peakHeapBytes=Math.max(this.peakHeapBytes??0,heapBytes);
  }
  setCheck(key:string,status:string){
    if(!Object.hasOwn(DEVICE_CASES,key)||!['untested','pass','fail'].includes(status))return false;
    this.checks[key as keyof typeof DEVICE_CASES]=status as Status;return true;
  }
  report(now:number){
    let p95:number|null=null,total=0;
    if(this.frames)for(let i=0;i<this.bins.length;i++){total+=this.bins[i];if(total>=Math.ceil(this.frames*.95)){p95=i;break;}}
    return {version:GAME_VERSION,running:this.running,elapsedMs:this.started===null?0:Math.max(0,(this.ended??now)-this.started),frames:this.frames,activeMs:this.activeMs,
      fps:this.activeMs?this.frames*1000/this.activeMs:null,recentFps:this.windowMs?this.windowFrames*1000/this.windowMs:null,minuteSamples:this.windows.map(w=>({...w})),p95FrameMs:p95===1000?null:p95,p95AtLeast1000Ms:p95===1000,maxFrameMs:this.maxFrameMs,
      gpu:this.gpu?{...this.gpu}:null,peakGpu:this.peakGpu?{...this.peakGpu}:null,heapBytes:this.heapBytes,peakHeapBytes:this.peakHeapBytes,checks:{...this.checks}};
  }
}

export type DeviceReport=ReturnType<DeviceCheck['report']>&{
  userAgent:string;viewport:{width:number;height:number;pixelRatio:number};audio:ReturnType<Sound['diagnostics']>;
};
type Draft={schema:1;savedAt:string;interrupted:boolean;report:DeviceReport};
type DraftStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const DRAFT_KEY='spinforge-device-draft-v1';
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:any,names:string[])=>object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const number=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const nullableNumber=(v:any)=>v===null||number(v);
const text=(v:any,max=64)=>typeof v==='string'&&v.length<=max;
function validDraft(d:any):d is Draft{
  if(!keys(d,['schema','savedAt','interrupted','report'])||d.schema!==1||!text(d.savedAt,32)||!Number.isFinite(Date.parse(d.savedAt))||typeof d.interrupted!=='boolean')return false;
  const r=d.report,base=new DeviceCheck().report(0);
  if(!keys(r,[...Object.keys(base),'userAgent','viewport','audio'])||!text(r.version,32)||!/^\d+\.\d+\.\d+$/.test(r.version)||r.running!==false)return false;
  if(!['elapsedMs','frames','activeMs','maxFrameMs'].every(k=>number(r[k]))||!['fps','recentFps','p95FrameMs','heapBytes','peakHeapBytes'].every(k=>nullableNumber(r[k]))||typeof r.p95AtLeast1000Ms!=='boolean')return false;
  const gpuKeys=['geometries','textures','programs','drawCalls','triangles','pixels'];
  if(![r.gpu,r.peakGpu].every(v=>v===null||keys(v,gpuKeys)&&gpuKeys.every(k=>number(v[k]))))return false;
  if(!Array.isArray(r.minuteSamples)||r.minuteSamples.length>30||!r.minuteSamples.every((s:any)=>keys(s,['atMs','fps'])&&number(s.atMs)&&nullableNumber(s.fps)))return false;
  if(!keys(r.checks,Object.keys(DEVICE_CASES))||!Object.values(r.checks).every(v=>['untested','pass','fail'].includes(v as string)))return false;
  if(!text(r.userAgent,1024)||!keys(r.viewport,['width','height','pixelRatio'])||!Object.values(r.viewport).every(number))return false;
  const a=r.audio;
  if(!keys(a,['status','state','ready','session','muted','musicVolume','contextTime','sampleRate','sources','music','buffers','rotors','friction','events']))return false;
  if(!['status','state'].every(k=>text(a[k]))||![a.session,a.music].every(v=>v===null||text(v))||typeof a.ready!=='boolean'||typeof a.muted!=='boolean')return false;
  if(!number(a.musicVolume)||a.musicVolume>1||!['contextTime','sampleRate'].every(k=>nullableNumber(a[k]))||!['sources','buffers','rotors','friction'].every(k=>number(a[k])))return false;
  return Array.isArray(a.events)&&a.events.length<=60&&a.events.every((e:any)=>keys(e,['atMs','kind'])&&number(e.atMs)&&text(e.kind)&&/^[a-z-]+$/.test(e.kind));
}
export class DiagnosticDraft{
  private storage:()=>DraftStorage;
  constructor(storage:()=>DraftStorage=()=>localStorage){this.storage=storage;}
  load():Draft|null{
    try{const raw=this.storage().getItem(DRAFT_KEY);if(!raw||raw.length*2>65536)return null;const d=JSON.parse(raw);return validDraft(d)?d:null;}catch{return null;}
  }
  save(report:DeviceReport,savedAt=new Date().toISOString()){
    const d={schema:1,savedAt,interrupted:report.running,report:{...report,running:false}};
    try{if(!validDraft(d))return false;const raw=JSON.stringify(d);if(raw.length*2>65536)return false;this.storage().setItem(DRAFT_KEY,raw);return true;}catch{return false;}
  }
  clear(){try{this.storage().removeItem(DRAFT_KEY);return true;}catch{return false;}}
}
