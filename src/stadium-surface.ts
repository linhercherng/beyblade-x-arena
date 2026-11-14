import{RADIUS}from'./physics.ts';
import type{Vector3}from'three';
// Visual relief only; the deterministic battle's x/z forces remain unchanged.
export function stadiumSurface(radius:number){
 const r=Math.max(0,Math.min(RADIUS,radius)),t=Math.max(0,Math.min(1,(r-1.25)/2.8));
 return r*r*.024-.03-.30*(1-t*t*(3-2*t));
}
export function stadiumNormal(x:number,z:number,out:Vector3){
 const r=Math.hypot(x,z),t=Math.max(0,Math.min(1,(r-1.25)/2.8));
 const slope=r>RADIUS?0:.048*r+.30*6*t*(1-t)/2.8;
 return r>0?out.set(-slope*x/r,1,-slope*z/r).normalize():out.set(0,1,0);
}
