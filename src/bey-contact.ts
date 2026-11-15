import {Vector3,Quaternion,Euler,Matrix4,Mesh,InstancedMesh,Group} from 'three';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import {stadiumSurface,stadiumNormal} from './stadium-surface.ts';

// Cache model geometry once; render frames only rotate the compact support hull.
export class BowlContact {
 readonly vertices:Vector3[]=[];
 readonly normal=new Vector3(0,1,0);
 readonly contact=new Vector3();
 readonly railPoint=new Vector3();
 private supports:Vector3[];
 private gears:Vector3[]=[];
 private ready=false;
 private up=new Vector3(0,1,0);
 private point=new Vector3();
 private target=new Vector3();
 private frame=new Quaternion();
 private attitude=new Quaternion();
 private bank=new Quaternion();
 private spin=new Quaternion();
 private euler=new Euler();
 readonly scale:number;
 private center=new Vector3();
 private model:Group;
 constructor(model:Group,radius?:number,centerHeight=0){
  this.model=model;model.updateMatrixWorld(true);
  const inverse=model.matrixWorld.clone().invert(),matrix=new Matrix4(),instance=new Matrix4();
  model.traverse(node=>{
   if(!(node instanceof Mesh))return;
   const positions=node.geometry.getAttribute('position');if(!positions)return;
   for(let i=0;i<(node instanceof InstancedMesh?node.count:1);i++){
    matrix.copy(node.matrixWorld);if(node instanceof InstancedMesh){node.getMatrixAt(i,instance);matrix.multiply(instance);}matrix.premultiply(inverse);
    for(let j=0;j<positions.count;j++){
     const p=new Vector3().fromBufferAttribute(positions,j).applyMatrix4(matrix);this.vertices.push(p);
     if(node.name==='bit-gear')this.gears.push(p);
    }
   }
  });
  this.scale=radius===undefined?1:radius/this.vertices.reduce((r,p)=>Math.max(r,Math.hypot(p.x,p.z)),0);
  if(this.scale!==1)this.vertices.forEach(p=>p.multiplyScalar(this.scale));
  this.center.set(0,centerHeight*this.scale,0);
  const hull=new ConvexHull().setFromPoints(this.vertices),points=new Set<Vector3>();
  for(const face of hull.faces){let edge=face.edge;do{points.add(edge.head().point);edge=edge.next;}while(edge!==face.edge);}
  this.supports=[...points];
 }
 reset(){this.ready=false;}
 place(x:number,z:number,leanX:number,leanZ:number,rotation:number,dt:number,grip?:{x:number;z:number;weight:number}){
  this.model.scale.setScalar(this.scale);
  const initial=!this.ready,weight=grip?.weight??0,gr=grip?Math.hypot(grip.x,grip.z):1,nx=grip?grip.x/gr:0,nz=grip?grip.z/gr:0;
  let px=x+(grip?grip.x-x:0)*weight,pz=z+(grip?grip.z-z:0)*weight;
  stadiumNormal(px,pz,this.target);
  if(!this.ready){this.normal.copy(this.target);this.ready=true;}else if(dt>0)this.normal.lerp(this.target,1-Math.exp(-18*dt)).normalize();
  this.frame.setFromUnitVectors(this.up,this.normal);
  this.bank.setFromEuler(this.euler.set(leanX,0,leanZ));this.frame.multiply(this.bank);
  if(initial)this.attitude.copy(this.frame);else if(dt>0)this.attitude.slerp(this.frame,1-Math.exp(-24*dt));
  this.frame.copy(this.attitude);
  if(weight>0){this.target.set(nx*Math.sin(.24),Math.cos(.24),nz*Math.sin(.24));this.bank.setFromUnitVectors(this.up,this.target);this.frame.slerp(this.bank,weight);}
  this.spin.setFromAxisAngle(this.up,rotation);this.model.quaternion.copy(this.frame).multiply(this.spin);
  this.support(x,z,grip);
 }
 rest(x:number,z:number,orientation:Quaternion){
  this.model.scale.setScalar(this.scale);this.model.quaternion.copy(orientation);this.support(x,z);
 }
 private support(x:number,z:number,grip?:{x:number;z:number;weight:number}){
  const weight=grip?.weight??0,gr=grip?Math.hypot(grip.x,grip.z):1,nx=grip?grip.x/gr:0,nz=grip?grip.z/gr:0;
  let px=x,pz=z;
  this.point.copy(this.center).applyQuaternion(this.model.quaternion);
  const baseX=x-this.point.x,baseZ=z-this.point.z;
  px=baseX+(grip?grip.x-baseX:0)*weight;pz=baseZ+(grip?grip.z-baseZ:0)*weight;
  let outer=-Infinity;
  if(weight>0){
   for(const p of this.gears){this.point.copy(p).applyQuaternion(this.model.quaternion);const r=this.point.x*nx+this.point.z*nz;if(r>outer){outer=r;this.railPoint.copy(this.point);}}
   const radius=4.13-outer;grip!.x=nx*radius;grip!.z=nz*radius;
   px=baseX+(grip!.x-baseX)*weight;pz=baseZ+(grip!.z-baseZ)*weight;
  }
  let height=-Infinity;
  for(const p of this.supports){
   this.point.copy(p).applyQuaternion(this.model.quaternion);
   const floor=stadiumSurface(Math.hypot(px+this.point.x,pz+this.point.z)),h=floor-this.point.y+.004;
   if(h>height){height=h;this.contact.set(px+this.point.x,floor,pz+this.point.z);}
  }
  this.model.position.set(px,height,pz);if(weight>0)this.railPoint.add(this.model.position);
 }
}
