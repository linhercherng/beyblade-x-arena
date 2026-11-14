type Player=0|1;
type Drag={player:Player;input:HTMLInputElement;pointerId?:number};
export function bindPlayerTouch(root:HTMLElement,enabled:()=>boolean,setAngle:(player:Player,angle:number)=>void){
  const local='#battle-controls[data-mode="local"]';
  const actions='button[data-action="lane"],button[data-action="direction"],button[data-action="lock"],button[data-action="shout"]';
  const nativeTouches='ontouchstart' in window;
  const drags=new Map<string,Drag>();
  const touchClicks=new WeakMap<HTMLButtonElement,{x:number;y:number;until:number}>();
  const buttonFor=(target:EventTarget|null)=>{
    const button=target instanceof Element?target.closest<HTMLButtonElement>(actions):null;
    return button?.closest(local)?button:null;
  };
  const inputFor=(target:EventTarget|null)=>{
    const input=target instanceof Element?target.closest<HTMLInputElement>('input[data-angle]'):null;
    return input?.closest(local)?input:null;
  };
  function end(id:string){
    const drag=drags.get(id);drags.delete(id);
    if(drag?.pointerId!==undefined){
      try{if(drag.input.hasPointerCapture?.(drag.pointerId))drag.input.releasePointerCapture?.(drag.pointerId);}
      catch{/* 旋轉或元件移除時捕捉可能已由瀏覽器取消。 */}
    }
  }
  function clear(){for(const id of drags.keys())end(id);}
  function move(id:string,x:number){
    const drag=drags.get(id);if(!drag)return;
    if(!enabled()||!drag.input.isConnected||drag.input.disabled){end(id);return;}
    const bounds=drag.input.getBoundingClientRect();
    if(bounds.width>0)setAngle(drag.player,Math.round(Math.max(0,Math.min(1,(x-bounds.left)/bounds.width))*30));
  }
  function start(id:string,input:HTMLInputElement,x:number,pointerId?:number){
    const player=Number(input.dataset.angle);
    if(!enabled()||input.disabled||(player!==0&&player!==1)||[...drags.values()].some(d=>d.player===player))return;
    drags.set(id,{player,input,pointerId});
    if(pointerId!==undefined){try{input.setPointerCapture?.(pointerId);}catch{/* window事件仍能完成或清理這次拖曳。 */}}
    move(id,x);
  }
  function remember(button:HTMLButtonElement,x:number,y:number){touchClicks.set(button,{x,y,until:performance.now()+1500});}
  // 有Touch Events的裝置以identifier處理手指，避免依賴Safari的指標捕捉生命週期。
  root.addEventListener('touchstart',e=>{
    let handled=false;
    for(const t of Array.from(e.changedTouches)){
      const input=inputFor(t.target),button=buttonFor(t.target);
      if(input){handled=true;if(nativeTouches)start('t'+t.identifier,input,t.clientX);}
      else if(nativeTouches&&button){handled=true;if(enabled()&&!button.disabled){remember(button,t.clientX,t.clientY);button.click();}}
    }
    if(handled&&e.cancelable)e.preventDefault();
  },{capture:true,passive:false});
  root.addEventListener('touchmove',e=>{
    if(!nativeTouches)return;
    let handled=false;
    for(const t of Array.from(e.changedTouches))if(drags.has('t'+t.identifier)){handled=true;move('t'+t.identifier,t.clientX);}
    if(handled&&e.cancelable)e.preventDefault();
  },{capture:true,passive:false});
  for(const name of ['touchend','touchcancel'] as const)root.addEventListener(name,e=>{
    if(!nativeTouches)return;
    let handled=false;
    for(const t of Array.from(e.changedTouches)){
      end('t'+t.identifier);
      const button=buttonFor(t.target);if(button)remember(button,t.clientX,t.clientY);
      handled=handled||!!button||!!inputFor(t.target);
    }
    if(handled&&e.cancelable)e.preventDefault();
  },{capture:true,passive:false});
  root.addEventListener('pointerdown',e=>{
    if(e.button!==0||!enabled()||(e.pointerType==='touch'&&nativeTouches))return;
    const input=inputFor(e.target),button=buttonFor(e.target);
    if(input&&!input.disabled){e.preventDefault();start('p'+e.pointerId,input,e.clientX,e.pointerId);}
    else if(button&&!button.disabled){e.preventDefault();if(e.pointerType==='touch')remember(button,e.clientX,e.clientY);button.click();}
  });
  window.addEventListener('pointermove',e=>{
    if(!drags.has('p'+e.pointerId))return;
    move('p'+e.pointerId,e.clientX);if(e.cancelable)e.preventDefault();
  },{passive:false});
  for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)window.addEventListener(name,e=>end('p'+e.pointerId));
  // Safari可能送出detail=0的觸控click；只攔同位置的已處理觸控，鍵盤的(0,0)不受影響。
  root.addEventListener('click',e=>{
    const button=buttonFor(e.target),recent=button&&touchClicks.get(button);
    const ghost=recent&&performance.now()<recent.until&&(e.clientX!==0||e.clientY!==0)&&Math.hypot(e.clientX-recent.x,e.clientY-recent.y)<20;
    if(button&&e.isTrusted&&(e.detail>0||ghost)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  let width=window.innerWidth;
  window.addEventListener('resize',()=>{if(window.innerWidth!==width){width=window.innerWidth;clear();}});
  for(const name of ['blur','orientationchange','pagehide','pageshow'] as const)window.addEventListener(name,clear);
  window.screen.orientation?.addEventListener('change',clear);
  return clear;
}
