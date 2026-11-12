import type { Battle, BattleEvent } from "./physics.ts";

const smooth = (x: number) => { const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t); };
export class DashHitPlayback {
  startedAt = -Infinity;
  private consumed = [0,0];
  private contactAt = -Infinity;
  private contactTime = -Infinity;
  reset() { this.startedAt=-Infinity;this.consumed=[0,0];this.contactAt=this.contactTime=-Infinity; }
  trigger(e: BattleEvent, battle: Battle, now: number) {
    if(e.type!=="hit" || !Number.isFinite(e.strength) || e.strength<3)return false;
    if(battle.tops.some(top=>top.dashUntil>e.time)) {this.contactAt=now;this.contactTime=e.time;}
    if(battle.result)return false;
    let fresh=false;
    battle.tops.forEach((top,i)=>{
      if(top.dashUntil>e.time && top.dashUntil>this.consumed[i]) {
        this.consumed[i]=top.dashUntil;fresh=true;
      }
    });
    if(!fresh || now-this.startedAt<.9)return false;
    this.startedAt=now;return true;
  }
  handoff(battle: Battle, now: number, reduced=false) {
    return !reduced && !!battle.result && battle.result.winner!==null && ["burst","over","extreme"].includes(battle.result.finish)
      && now-this.contactAt>=0 && now-this.contactAt<=.45 && battle.time-this.contactTime>=0 && battle.time-this.contactTime<=.65;
  }
  sample(now: number, reduced=false) {
    const age=now-this.startedAt;
    if(reduced || age<0 || age>=.4)return {scale:1,zoom:0,shock:0};
    return {
      scale:age<.035?.12:age<.15?.28:.28+.72*smooth((age-.15)/.15),
      zoom:smooth(age/.045)*(1-smooth((age-.09)/.27)),
      shock:1-smooth(age/.24),
    };
  }
}
export function hitZoomFactor(distance: number, minimum: number, weight: number) {
  return Math.min(1,Math.max(minimum/Math.max(.001,distance),1-.14*weight));
}
