import type { Battle, BattleEvent } from "./physics.ts";

const smooth = (x: number) => { const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t); };
export class DashHitPlayback {
  startedAt = -Infinity;
  private consumed = [0,0];
  reset() { this.startedAt=-Infinity;this.consumed=[0,0]; }
  trigger(e: BattleEvent, battle: Battle, now: number) {
    if(e.type!=="hit" || battle.result || !Number.isFinite(e.strength) || e.strength<3)return false;
    let fresh=false;
    battle.tops.forEach((top,i)=>{
      if(top.dashUntil>e.time && top.dashUntil>this.consumed[i]) {
        this.consumed[i]=top.dashUntil;fresh=true;
      }
    });
    if(!fresh || now-this.startedAt<.9)return false;
    this.startedAt=now;return true;
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
