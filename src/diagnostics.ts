export const GAME_VERSION='0.22.0';
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
