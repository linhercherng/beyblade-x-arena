import{Vector2}from'three';
import type{Arena}from'../../src/arena.ts';
export function fixtureProfile(arena:Arena){
 const options=new URLSearchParams(location.search),softwareGpu=options.has('software-gpu'),audioOnly=options.has('audio-only'),renderer=arena.renderer;
 if(softwareGpu){const resize=arena.resize.bind(arena);renderer.shadowMap.enabled=false;arena.resize=()=>{resize();const size=renderer.getSize(new Vector2());renderer.setDrawingBufferSize(size.x,size.y,.25);};}
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),gpu=String(gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
 if(audioOnly)renderer.render=(scene,camera)=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);};
 return {softwareGpu,info:()=>{const size=renderer.getSize(new Vector2());return{softwareGpu,audioOnly,renderer:gpu,pixelRatio:renderer.getPixelRatio(),width:renderer.domElement.width,height:renderer.domElement.height,cssWidth:size.x,cssHeight:size.y,aspect:arena.camera.aspect,shadows:renderer.shadowMap.enabled};}};
}
export function batchDraw(arena:Arena,run:()=>void){
 const renderer=arena.renderer,render=renderer.render;
 renderer.render=(scene,camera)=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);};
 try{run();}finally{renderer.render=render;renderer.render(arena.scene,arena.camera);}
}
