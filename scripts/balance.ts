import { BEYS, type BeyType } from "../src/catalog.ts";
import { createBattle, stepBattle, shout } from "../src/physics.ts";
import { writeFileSync } from "node:fs";
const types: BeyType[] = ["attack", "defense", "stamina", "balance"];
const totals: Record<
  string,
  {
    wins: number;
    losses: number;
    draws: number;
    seconds: number;
    count: number;
  }
> = {};
const finishes: Record<string, number> = {};
let min = Infinity,
  max = 0,
  dashes = 0;
for (let i = 0; i < 4; i++)
  for (let j = i; j < 4; j++)
    for (let seed = 1; seed <= 80; seed++) {
      const poolA = BEYS.filter((b) => b.type === types[i]),
        poolB = BEYS.filter((b) => b.type === types[j]);
      const a = poolA[seed % poolA.length],
        b = poolB[(seed * 7) % poolB.length];
      const inputs = [
        { power: 0.95, lane: seed % 3, angle: seed % 25 },
        { power: 0.95, lane: (seed + 1) % 3, angle: (seed * 3) % 25 },
      ];
      const s = createBattle(a, b, inputs, seed);
      while (!s.result && s.time < 90) {
        if (s.tick === 720) shout(s, 0);
        if (s.tick === 840) shout(s, 1);
        stepBattle(s);
      }
      if (!s.result) throw new Error(`未終結 ${a.name}/${b.name}`);
      const key = `${types[i]} vs ${types[j]}`;
      const t = (totals[key] ??= {
        wins: 0,
        losses: 0,
        draws: 0,
        seconds: 0,
        count: 0,
      });
      if (s.result.winner === 0) t.wins++;
      else if (s.result.winner === 1) t.losses++;
      else t.draws++;
      t.seconds += s.time;
      t.count++;
      min = Math.min(min, s.time);
      max = Math.max(max, s.time);
      dashes += s.tops.reduce((n, t) => n + t.dashes, 0);
      finishes[s.result.finish] = (finishes[s.result.finish] ?? 0) + 1;
    }
const report = {
  simulations: Object.values(totals).reduce((n, v) => n + v.count, 0),
  minSeconds: min,
  maxSeconds: max,
  dashes,
  finishes,
  pairs: Object.fromEntries(
    Object.entries(totals).map(([k, t]) => [
      k,
      {
        ...t,
        winRate: Math.round((t.wins / t.count) * 1000) / 10,
        meanSeconds: Math.round((t.seconds / t.count) * 10) / 10,
      },
    ]),
  ),
};
writeFileSync(
  new URL("../docs/balance-report.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
