import type{Page}from'@playwright/test';

export async function holdFrameAt(page:Page,selector:string){
 await page.addInitScript(selector=>{
  const w=window as any,request=window.requestAnimationFrame.bind(window),pending:FrameRequestCallback[]=[];let armed=true,resumed=0;
  window.requestAnimationFrame=cb=>request(time=>{if(armed&&document.querySelector(selector))pending.push(cb);else{if(!armed)resumed++;cb(time);}});
  w.stageFrameHold={state:()=>({held:pending.length,resumed}),release:()=>{armed=false;for(const cb of pending.splice(0))window.requestAnimationFrame(cb);}};
 },selector);
}
