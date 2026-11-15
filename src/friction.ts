import{stopMotion}from'./motion.ts';
export type FrictionMaterial='metal'|'plastic'|'rubber';
export interface FrictionFrame{phase:'off'|'spin'|'settle';level:number;rate:number;cutoff:number;pan:number;material:FrictionMaterial}
export function frictionFrame(rpm:number,tilt:number,rotation:number,player:number,stopAge:number|null=null,stopRpm=0,material:FrictionMaterial='plastic'):FrictionFrame{
 const off:FrictionFrame={phase:'off',level:0,rate:1,cutoff:material==='metal'?3200:material==='rubber'?950:1800,pan:0,material};
 if(stopAge!==null){
  if(stopAge>=1.6||stopAge<0)return off;
  const m=stopMotion(stopAge,stopRpm),tail=1-stopAge/1.6;
  return{...off,phase:'settle',level:Math.min(.25,2*(.04+.2*Math.sin(Math.PI*m.fall)**2+Math.abs(m.rock)*2)*tail),rate:.55+.35*(1-m.fall)+Math.abs(m.rock)*3,cutoff:off.cutoff*(1-.3*m.fall)};
 }
 if(rpm<=0||rpm>=.32)return off;
 const slow=(.32-rpm)/.32,pulse=.65+.35*Math.abs(Math.sin(rotation*.12+player*1.7));
 return{...off,phase:'spin',level:Math.min(.25,2*slow*slow*(.05+.18*Math.min(1,Math.max(0,tilt)/.7))*pulse),rate:.65+rpm*1.2,cutoff:off.cutoff*(.7+.3*pulse)};
}
export function frictionSamples(rate:number,material:FrictionMaterial='plastic'){
 const n=Math.round(rate*.6),blend=Math.round(rate*.02),raw=new Float32Array(n+blend),out=new Float32Array(n);let seed=32017,low=0,peak=0,energy=0;
 const smoothing=1-Math.exp(-2*Math.PI*(material==='rubber'?180:material==='metal'?2600:850)/rate);
 for(let i=0;i<raw.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1,t=i/rate;low+=smoothing*(noise-low);
  if(material==='metal')raw[i]=(noise-low)*.32+low*.1+(.14*Math.sin(2*Math.PI*1380*t)+.07*Math.sin(2*Math.PI*2210*t))*(.6+.4*Math.sin(2*Math.PI*30*t))**2;
  else if(material==='rubber')raw[i]=low*.8+.12*Math.sin(2*Math.PI*180*t)*(.5+.5*Math.sin(2*Math.PI*20*t))**2;
  else raw[i]=(low*.75+(noise-low)*.08)*(.72+.28*Math.cos(2*Math.PI*50*t))**2;
 }
 for(let i=0;i<n;i++){const w=i/blend;out[i]=i<blend?raw[n+i]*(1-w)+raw[i]*w:raw[i];peak=Math.max(peak,Math.abs(out[i]));energy+=out[i]**2;}
 const gain=Math.min(.59/peak,.12/Math.sqrt(energy/n));
 for(let i=0;i<n;i++)out[i]*=gain;
 return out;
}
