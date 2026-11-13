type Player=0|1;
export function bindPlayerTouch(root:HTMLElement,enabled:()=>boolean,setAngle:(player:Player,angle:number)=>void){
  const local='#battle-controls[data-mode="local"]';
  const actions='button[data-action="lane"],button[data-action="direction"],button[data-action="lock"],button[data-action="shout"]';
  const drags=new Map<number,{player:Player;input:HTMLInputElement}>();
  const buttonFor=(target:EventTarget|null)=>{
    const button=target instanceof Element?target.closest<HTMLButtonElement>(actions):null;
    return button?.closest(local)?button:null;
  };
  function end(id:number){
    const drag=drags.get(id);drags.delete(id);
    if(drag?.input.hasPointerCapture(id))drag.input.releasePointerCapture(id);
  }
  function clear(){for(const id of drags.keys())end(id);}
  function move(e:PointerEvent){
    const drag=drags.get(e.pointerId);if(!drag)return;
    if(!enabled()||!drag.input.isConnected||drag.input.disabled){end(e.pointerId);return;}
    const bounds=drag.input.getBoundingClientRect();
    if(bounds.width>0)setAngle(drag.player,Math.round(Math.max(0,Math.min(1,(e.clientX-bounds.left)/bounds.width))*30));
    e.preventDefault();
  }
  // 原生range另有TouchEvent拖曳；停用它，避免暫停後仍自行改動顯示值。
  root.addEventListener('touchstart',e=>{
    if(e.target instanceof Element&&e.target.matches('input[data-angle]')&&e.target.closest(local))e.preventDefault();
  },{capture:true,passive:false});
  root.addEventListener('pointerdown',e=>{
    if(e.button!==0||!enabled())return;
    const input=e.target instanceof Element?e.target.closest<HTMLInputElement>('input[data-angle]'):null;
    if(input?.closest(local)&&!input.disabled){
      e.preventDefault();
      const player=Number(input.dataset.angle);
      if((player!==0&&player!==1)||[...drags.values()].some(d=>d.player===player))return;
      drags.set(e.pointerId,{player,input});input.setPointerCapture(e.pointerId);move(e);
      return;
    }
    const button=buttonFor(e.target);
    if(button&&!button.disabled){
      e.preventDefault();
      button.click();
    }
  });
  root.addEventListener('pointermove',move);
  for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)
    root.addEventListener(name,e=>end(e.pointerId));
  // 按下時已處理所有指標；攔截瀏覽器隨後的實體click，保留鍵盤／輔助工具click。
  root.addEventListener('click',e=>{
    if(e.isTrusted&&e.detail>0&&buttonFor(e.target)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  window.addEventListener('blur',clear);
  return clear;
}
