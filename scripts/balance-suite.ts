import { BEYS, type BeyType } from "../src/catalog.ts";
import { createBattle, stepBattle, shout, rng } from "../src/physics.ts";
export const TYPES: BeyType[] = ["attack", "defense", "stamina", "balance"];
export function runSuite(samples = 32, firstSeed = 1) {
  const pools = TYPES.map((t) => BEYS.filter((b) => b.type === t));
  const totals = Object.fromEntries(
    TYPES.map((t) => [t, { played: 0, wins: 0, draws: 0, points: 0 }]),
  );
  const pairs: Record<
    string,
    { played: number; wins: number; draws: number; seconds: number }
  > = {};
  const finishes: Record<string, number> = {
    spin: 0,
    burst: 0,
    over: 0,
    extreme: 0,
  };
  const times: number[] = [];
  const outsideCases: { beys: string[]; seed: number; launches: unknown; time: number }[] = [];
  let dashes = 0;
  for (let i = 0; i < 4; i++)
    for (let j = i; j < 4; j++)
      for (let n = 0; n < samples; n++) {
        const seed =
          (firstSeed + n * 104729 + i * 15485863 + j * 32452843) >>> 0;
        const random = rng(seed),
          a = pools[i][Math.floor(random() * pools[i].length)],
          b = pools[j][Math.floor(random() * pools[j].length)];
        const input = [0, 1].map(() => ({
          power: 0.65 + random() * 0.35,
          lane: Math.floor(random() * 3),
          angle: Math.round(random() * 30),
        }));
        for (const swapped of i === j ? [false] : [false, true]) {
          const beys = swapped ? [b, a] : [a, b],
            launches = swapped ? [input[1], input[0]] : input;
          const s = createBattle(beys[0], beys[1], launches, seed);
          while (!s.result && s.time < 90) {
            if (s.tick === 720) shout(s, swapped ? 1 : 0);
            if (s.tick === 840) shout(s, swapped ? 0 : 1);
            stepBattle(s);
          }
          if (!s.result) throw new Error(`未終結：${a.name}/${b.name}`);
          times.push(s.time);
          if (s.time < 15 || s.time > 40)
            outsideCases.push({ beys: beys.map(b => b.id), seed, launches, time: s.time });
          finishes[s.result.finish]++;
          dashes += s.tops[0].dashes + s.tops[1].dashes;
          for (const p of [0, 1]) {
            const type = beys[p].type,
              opponent = beys[1 - p].type;
            const t = totals[type];
            t.played++;
            const pair = (pairs[`${type}:${opponent}`] ??= {
              played: 0,
              wins: 0,
              draws: 0,
              seconds: 0,
            });
            pair.played++;
            pair.seconds += s.time;
            if (s.result.winner === p) {
              t.wins++;
              t.points++;
              pair.wins++;
            }
            if (s.result.winner === null) {
              t.draws++;
              t.points += 0.5;
              pair.draws++;
            }
          }
        }
      }
  times.sort((a, b) => a - b);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return {
    samples,
    firstSeed,
    battles: times.length,
    minSeconds: round(times[0]),
    maxSeconds: round(times.at(-1)!),
    meanSeconds: round(times.reduce((a, b) => a + b, 0) / times.length),
    p05: round(times[Math.floor(times.length * 0.05)]),
    p95: round(times[Math.floor(times.length * 0.95)]),
    outsideTarget: times.filter((t) => t < 15 || t > 40).length,
    outsideCases,
    finishes,
    dashes,
    types: Object.fromEntries(
      TYPES.map((type) => [
        type,
        {
          ...totals[type],
          winRate: round((totals[type].wins / totals[type].played) * 100),
          scoreRate: round((totals[type].points / totals[type].played) * 100),
        },
      ]),
    ),
    pairs: Object.fromEntries(
      Object.entries(pairs).map(([key, v]) => [
        key,
        {
          ...v,
          winRate: round((v.wins / v.played) * 100),
          meanSeconds: round(v.seconds / v.played),
        },
      ]),
    ),
  };
}
export function runEdges() {
  const opponents = TYPES.map((t) => BEYS.find((b) => b.type === t)!);
  let battles = 0,
    minSeconds = Infinity,
    maxSeconds = 0;
  const failures: {
    beys: string[];
    inputs: unknown;
    seed: number;
    time: number;
  }[] = [];
  for (const [index, a] of BEYS.entries())
    for (const [i, b] of opponents.entries())
      for (const [p0, p1] of [
        [0.65, 0.65],
        [0.65, 1],
        [1, 0.65],
        [1, 1],
      ])
        for (const [lane, angle] of [
          [0, 0],
          [1, 15],
          [2, 30],
        ]) {
          const seed = (index * 7919 + i * 104729 + 1234567) >>> 0;
          const inputs = [
            { power: p0, lane, angle },
            { power: p1, lane: 2 - lane, angle: 30 - angle },
          ];
          const s = createBattle(a, b, inputs, seed);
          while (!s.result && s.time < 50) stepBattle(s);
          battles++;
          minSeconds = Math.min(minSeconds, s.time);
          maxSeconds = Math.max(maxSeconds, s.time);
          if (s.time < 15 || s.time > 40)
            failures.push({ beys: [a.id, b.id], inputs, seed, time: s.time });
        }
  return {
    battles,
    minSeconds,
    maxSeconds,
    outsideTarget: failures.length,
    failures,
  };
}

export function runAllPairs() {
  let battles = 0, minSeconds = Infinity, maxSeconds = 0;
  const failures: unknown[] = [];
  for (const [i, a] of BEYS.entries()) for (const [j, b] of BEYS.entries())
    for (let sample = 0; sample < 4; sample++) {
      const seed = (20261113 + i * 104729 + j * 7919 + sample * 15485863) >>> 0;
      const random = rng(seed);
      const powers = [[.4, .4], [.65, 1], [1, 1], [.4 + random() * .6, .4 + random() * .6]][sample];
      const inputs = powers.map((power, p) => ({ power, lane: (sample + p) % 3, angle: sample === 3 ? random() * 30 : p ? 30 : 0 }));
      const s = createBattle(a, b, inputs, seed);
      while (!s.result && s.time < 41) {
        if (sample % 2 && s.tick === 720) shout(s, 0);
        if (sample % 2 && s.tick === 840) shout(s, 1);
        stepBattle(s);
      }
      battles++;
      minSeconds = Math.min(minSeconds, s.time); maxSeconds = Math.max(maxSeconds, s.time);
      if (!s.result || s.time < 15 || s.time > 40) failures.push({ beys: [a.id, b.id], seed, inputs, sample, time: s.time });
    }
  return { battles, minSeconds, maxSeconds, outsideTarget: failures.length, failures };
}
