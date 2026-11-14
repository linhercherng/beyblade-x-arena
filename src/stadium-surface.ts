import{RADIUS}from'./physics.ts';
// Visual relief only; the deterministic battle's x/z forces remain unchanged.
export function stadiumSurface(radius:number){
 const r=Math.max(0,Math.min(RADIUS,radius)),t=Math.max(0,Math.min(1,(r-1.25)/2.8));
 return r*r*.024-.03-.30*(1-t*t*(3-2*t));
}
