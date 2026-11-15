import{stopMotion}from'./motion.ts';
export interface FrictionFrame{phase:'off'|'spin'|'settle';level:number;rate:number;cutoff:number;pan:number}
export function frictionFrame(rpm:number,tilt:number,rotation:number,player:number,stopAge:number|null=null,stopRpm=0):FrictionFrame{
 const off:FrictionFrame={phase:'off',level:0,rate:1,cutoff:1500,pan:0};
 if(stopAge!==null){
  if(stopAge>=1.6||stopAge<0)return off;
  const m=stopMotion(stopAge,stopRpm),tail=1-stopAge/1.6;
  return{...off,phase:'settle',level:Math.min(.25,(.04+.2*Math.sin(Math.PI*m.fall)**2+Math.abs(m.rock)*2)*tail),rate:.55+.35*(1-m.fall)+Math.abs(m.rock)*3};
 }
 if(rpm<=0||rpm>=.32)return off;
 const slow=(.32-rpm)/.32,pulse=.65+.35*Math.abs(Math.sin(rotation*.12+player*1.7));
 return{...off,phase:'spin',level:slow*slow*(.05+.18*Math.min(1,Math.max(0,tilt)/.7))*pulse,rate:.65+rpm*1.2};
}
export function frictionSamples(rate:number){
 const n=Math.round(rate*.6),blend=Math.round(rate*.02),raw=new Float32Array(n+blend),out=new Float32Array(n);let seed=32017,low=0,peak=0;
 for(let i=0;i<raw.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low+=.08*(noise-low);raw[i]=low*.75+(noise-low)*.05;}
 for(let i=0;i<n;i++){const w=i/blend;out[i]=i<blend?raw[n+i]*(1-w)+raw[i]*w:raw[i];peak=Math.max(peak,Math.abs(out[i]));}
 for(let i=0;i<n;i++)out[i]*=.6/peak;
 return out;
}
