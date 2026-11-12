import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { BEYS, NEW_BEY_IDS } from "../src/catalog.ts";
import { createBattle, stepBattle, shout, rng, ENGINE_VERSION } from "../src/physics.ts";

const failures: unknown[] = [];
const finishes: Record<string, number> = { spin: 0, burst: 0, over: 0, extreme: 0 };
const beys = BEYS.filter(b => NEW_BEY_IDS.has(b.id));
let battles = 0, minSeconds = Infinity, maxSeconds = 0;
for (const [i, a] of beys.entries()) for (const [j, b] of BEYS.entries())
  for (let sample = 0; sample < 3; sample++) for (const swapped of [false, true]) {
    const seed = (20261112 + i*104729 + j*7919 + sample*15485863) >>> 0;
    const random = rng(seed);
    const launches = [0, 1].map(() => ({ power: .65+random()*.35, lane: Math.floor(random()*3), angle: Math.round(random()*30) }));
    const battle = createBattle(swapped ? b : a, swapped ? a : b, swapped ? [launches[1],launches[0]] : launches, seed);
    while (!battle.result && battle.time < 50) {
      if (battle.tick === 720) shout(battle, swapped ? 1 : 0);
      if (battle.tick === 840) shout(battle, swapped ? 0 : 1);
      stepBattle(battle);
    }
    battles++;
    if (battle.result) finishes[battle.result.finish]++;
    minSeconds = Math.min(minSeconds,battle.time);maxSeconds = Math.max(maxSeconds,battle.time);
    if (!battle.result || battle.time < 15 || battle.time > 40)
      failures.push({beys:[a.id,b.id],seed,launches,swapped,time:battle.time,result:battle.result});
  }
const report = { checkedAt: "2026-11-12", engineVersion: ENGINE_VERSION, method: "新增8款各對全91款，3組獨立種子、交換先後手；65–100%蓄力、三落點、0–30度傾角及呼喊。", battles, minSeconds, maxSeconds, finishes, outsideTarget:failures.length, failures };
writeFileSync(new URL("../docs/expansion-balance-report.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
assert.equal(failures.length,0,"新增款存在超出15–40秒的個案");
