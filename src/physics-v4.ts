import type { Bey, BeyType } from "./catalog.ts";
import {
  createBattle as createLegacyBattle,
  stepBattle as stepLegacyBattle,
} from "./physics-v1.ts";
import legacyStats from "./legacy-stats.json" with { type: "json" };
import { createBattle as createVersion2Battle, stepBattle as stepVersion2Battle } from "./physics-v2.ts";
import { createBattle as createVersion3Battle, stepBattle as stepVersion3Battle } from "./physics-v3.ts";
export const ENGINE_VERSION = 4;
export const COMBAT_STYLE: Record<BeyType, { label: string; description: string; force: number; brace: number; drain: number }> = {
  attack: { label: "外圈追擊", description: "高速繞行與齒軌追擊，以強衝量逼出盤外，但反作用力與耗轉較高。", force: 1.12, brace: 1.05, drain: 1.03 },
  defense: { label: "中心反擊", description: "穩守中心減少擊退，受擊後以反作用力回擊，爭取爆裂或越界。", force: 1, brace: .8, drain: 1 },
  stamina: { label: "穩定巡航", description: "低速小圈維持轉速，靠穩定與傳能拖入持久戰，但較容易被撞飛。", force: .9, brace: 1.1, drain: .95 },
  balance: { label: "攻守切換", description: "週期切換中心防守與外圈進攻，兼顧耗轉與衝撞機會。", force: 1.02, brace: .95, drain: 1 },
};
export const PACING = { minSeconds: 15, fatigueFrom: 30, maxSeconds: 40, reserveRpm: 0.03, reserveBurstFraction: .4 };
export const TUNING = {
  friction: 0.034,
  staminaFriction: 0.0001,
  impactSpin: 0.0004,
  burstLoss: 14,
  burstExponent: 3,
  knockback: 2.1,
  hitRecovery: 1.1,
  lip: .8,
  gyroLift: 1.5,
  attackSpeed: 4.5,
};
export const DT = 1 / 120;
export const RADIUS = 4.25;
export const TOP_RADIUS = 0.39;
export const GATE_HALF_ANGLES = { over: .24, extreme: .29 };
export const FINISH = {
  spin: { label: "旋轉終結", en: "SPIN FINISH", points: 1 },
  over: { label: "越界終結", en: "OVER FINISH", points: 2 },
  burst: { label: "爆裂終結", en: "BURST FINISH", points: 2 },
  extreme: { label: "極限終結", en: "XTREME FINISH", points: 3 },
};
export type Finish = keyof typeof FINISH;
export interface Launch {
  power: number;
  lane: number;
  angle: number;
}
export interface Top {
  bey: Bey;
  x: number;
  z: number;
  vx: number;
  vz: number;
  rpm: number;
  burst: number;
  tilt: number;
  dashUntil: number;
  railCooldown: number;
  boostUntil: number;
  shouted: boolean;
  hitUntil: number;
  impulse: number;
  maxImpulse: number;
  dashes: number;
  rotation: number;
  exiting?: "over" | "extreme";
}
export interface Result {
  winner: 0 | 1 | null;
  finish: Finish;
  points: number;
  time: number;
}
export interface BattleEvent {
  type: "hit" | "dash" | "finish" | "shout";
  x: number;
  z: number;
  strength: number;
  player: number;
  time: number;
}
export interface Battle {
  version?: 1 | 2 | 3 | 4;
  tops: [Top, Top];
  time: number;
  tick: number;
  seed: number;
  result: Result | null;
  events: BattleEvent[];
  contactCooldown: number;
  shouts: [number[], number[]];
}
export function rng(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function createBattle(
  a: Bey,
  b: Bey,
  inputs: readonly Launch[],
  seed: number,
  version: 1 | 2 | 3 | 4 = ENGINE_VERSION,
): Battle {
  if (version === 3) return createVersion3Battle(a, b, inputs, seed, 3);
  if (version === 2) return createVersion2Battle(a, b, inputs, seed, 2);
  if (version === 1) {
    const original = (b: Bey) => ({
      ...b,
      stats: (legacyStats as Record<string, Bey["stats"]>)[b.id] ?? b.stats,
    });
    return {
      ...createLegacyBattle(original(a), original(b), inputs, seed),
      version: 1,
    };
  }
  const random = rng(seed);
  const tops = [a, b].map((bey, i) => {
    const input = inputs[i];
    if (
      !input ||
      !Number.isFinite(input.power) ||
      input.power < 0.4 ||
      input.power > 1 ||
      !Number.isInteger(input.lane) ||
      input.lane < 0 ||
      input.lane > 2 ||
      !Number.isFinite(input.angle) ||
      input.angle < 0 ||
      input.angle > 30
    )
      throw new Error("發射輸入不合法");
    const theta = (i ? Math.PI : 0) + 0.3 + (random() - 0.5) * 0.2;
    const r = [1.0, 2.4, 3.5][input.lane];
    const orbit =
      bey.type === "attack" ? 3.8 : bey.type === "balance" ? 2.6 : 1.15;
    const speed = orbit * (0.8 + input.angle / 45) * input.power;
    const spin = bey.spin === "L" ? -1 : 1;
    return {
      bey,
      x: Math.cos(theta) * r,
      z: Math.sin(theta) * r,
      vx: -Math.sin(theta) * speed * spin - Math.cos(theta) * 0.6,
      vz: Math.cos(theta) * speed * spin - Math.sin(theta) * 0.6,
      rpm: input.power,
      burst: bey.stats.burst,
      tilt: 0,
      dashUntil: 0,
      railCooldown: 1.3,
      boostUntil: 0,
      hitUntil: 0,
      shouted: false,
      impulse: 0,
      maxImpulse: 0,
      dashes: 0,
      rotation: 0,
    };
  }) as [Top, Top];
  return {
    version,
    tops,
    time: 0,
    tick: 0,
    seed,
    result: null,
    events: [],
    contactCooldown: 0,
    shouts: [[], []],
  };
}
export function finishFor(
  t: Pick<Top, "rpm" | "burst" | "x" | "z" | "exiting">,
): Finish | null {
  if (Math.hypot(t.x, t.z) > RADIUS + 0.18)
    return t.exiting ?? (t.z > 3.8 && Math.abs(t.x) < 1.3 ? "extreme" : "over");
  if (t.burst <= 0) return "burst";
  if (t.rpm <= 0) return "spin";
  return null;
}
export function shout(s: Battle, player: 0 | 1) {
  const t = s.tops[player];
  if (t.shouted || s.result) return false;
  t.shouted = true;
  t.boostUntil = s.time + 2;
  s.shouts[player].push(s.tick);
  s.events.push({
    type: "shout",
    x: t.x,
    z: t.z,
    strength: 1,
    player,
    time: s.time,
  });
  return true;
}
export function stepBattle(s: Battle) {
  if (s.version === 3) {
    stepVersion3Battle(s as Parameters<typeof stepVersion3Battle>[0]);
    return;
  }
  if (s.version === 1) {
    stepLegacyBattle(s);
    return;
  }
  if (s.version === 2) {
    stepVersion2Battle(s as Parameters<typeof stepVersion2Battle>[0]);
    return;
  }
  if (s.result) return;
  s.tick++;
  s.time = s.tick * DT;
  s.events = [];
  for (const [i, t] of s.tops.entries()) {
    const style = COMBAT_STYLE[t.bey.type];
    const r = Math.max(0.01, Math.hypot(t.x, t.z));
    // 出口尚未完全離盤時被撞回，立即恢復盤內操舵與護牆。
    if (t.exiting && (r <= RADIUS - TOP_RADIUS * .4 || t.x * t.vx + t.z * t.vz <= 0)) t.exiting = undefined;
    const spin = t.bey.spin === "L" ? -1 : 1;
    t.tilt = Math.max(t.tilt - DT * 0.18, 0, (0.3 - t.rpm) / 0.3);
    const moving =
      t.bey.type === "attack" || (t.bey.type === "balance" && Math.sin(s.time * .7 + i * 1.9) > 0);
    const target = moving
      ? 0.2 + 3.85 * (0.5 + 0.5 * Math.sin(s.time * 1.7 + i * 1.9))
      : t.bey.type === "stamina"
        ? 0.65
        : 0.25;
    const rv = (t.vx * t.x + t.vz * t.z) / r;
    const tv = (-t.vx * t.z + t.vz * t.x) / r;
    const radial =
      (target - r) * 4.5 - rv * 1.8 - Math.min(25, (tv * tv) / r) * 0.8;
    const tangent =
      ((moving
        ? TUNING.attackSpeed * (0.6 + 0.4 * t.rpm)
        : 0.7 * Math.max(0.15, t.rpm)) *
        spin -
        tv) *
      1.8;
    const wobble = Math.sin(s.time * 19 + i * 2) * t.tilt * 0.8;
    const steering = t.exiting ? 0 : s.time < t.hitUntil || s.time < t.dashUntil ? 0.07 : 1;
    t.vx += ((radial * t.x) / r - (tangent * t.z) / r + wobble) * DT * steering;
    t.vz += ((radial * t.z) / r + (tangent * t.x) / r - wobble) * DT * steering;
    const drag = Math.exp(-(s.time < t.dashUntil ? 0.08 : 0.6) * DT);
    t.vx *= drag;
    t.vz *= drag;
    const cap = s.time < t.dashUntil ? 13 : 7.5;
    const speed = Math.hypot(t.vx, t.vz);
    if (speed > cap) {
      t.vx *= cap / speed;
      t.vz *= cap / speed;
    }
    t.x += t.vx * DT;
    t.z += t.vz * DT;
    const endurance =
      (TUNING.friction - t.bey.stats.sta * TUNING.staminaFriction) * style.drain;
    // 末段對兩方施加相同耗轉；不補能量，總轉速必在40秒前耗盡。
    const fatigue = s.time > PACING.fatigueFrom ? 1.1 / (PACING.maxSeconds - PACING.fatigueFrom) : 0;
    t.rpm = Math.max(
      0,
      t.rpm - DT * (endurance + fatigue + speed * 0.00005 + t.tilt * 0.0015),
    );
    t.rotation += spin * t.rpm * DT * 65;
    const newR = Math.hypot(t.x, t.z);
    if (!t.exiting && newR > 3.48 && s.time > t.railCooldown && t.rpm > 0.24 && speed > 1.7) {
      // 齒軌接觸門檻由衝刺值與兩秒氣勢降低，不以亂數決定勝負。
      const tangential = Math.abs((-t.z * t.vx + t.x * t.vz) / newR);
      if (
        tangential >
        3.6 - t.bey.stats.dash * 0.018 - (s.time < t.boostUntil ? 1.5 : 0)
      ) {
        const opponent = s.tops[1 - i],
          aimX = opponent.x - t.x,
          aimZ = opponent.z - t.z,
          aim = Math.hypot(aimX, aimZ);
        t.vx = (aimX / Math.max(0.1, aim)) * (7 + t.bey.stats.dash * 0.04);
        t.vz = (aimZ / Math.max(0.1, aim)) * (7 + t.bey.stats.dash * 0.04);
        t.dashUntil = s.time + 0.65;
        t.railCooldown = s.time + 2.8;
        t.dashes++;
        t.rpm = Math.max(0, t.rpm - 0.003);
        s.events.push({
          type: "dash",
          x: t.x,
          z: t.z,
          strength: 1,
          player: i,
          time: s.time,
        });
      }
    }
    if (!t.exiting && newR > RADIUS - TOP_RADIUS * 0.4) {
      const outwardSpeed = (t.vx * t.x + t.vz * t.z) / newR;
      const canClearLip = s.time >= PACING.minSeconds && outwardSpeed > TUNING.lip + TUNING.gyroLift * t.rpm;
      const sidePocket =
        Math.abs(t.z) < Math.abs(t.x) * Math.tan(GATE_HALF_ANGLES.over) && Math.abs(t.x) > 3.8 && canClearLip;
      const extremePocket = t.z > 3.8 && Math.abs(t.x) < t.z * Math.tan(GATE_HALF_ANGLES.extreme) && canClearLip;
      // 通過出口門檻後以動量滑出，不能在下一tick被同一道護牆拉回。
      if (sidePocket || extremePocket) t.exiting = extremePocket ? "extreme" : "over";
      if (!sidePocket && !extremePocket) {
        const nx = t.x / newR,
          nz = t.z / newR,
          outward = t.vx * nx + t.vz * nz;
        if (outward > 0) {
          t.vx -= 1.65 * outward * nx;
          t.vz -= 1.65 * outward * nz;
          t.rpm = Math.max(0, t.rpm - Math.min(0.004, outward * 0.0002));
        }
        t.x = nx * (RADIUS - TOP_RADIUS * 0.4);
        t.z = nz * (RADIUS - TOP_RADIUS * 0.4);
      }
    }
  }
  const [a, b] = s.tops;
  const dx = b.x - a.x,
    dz = b.z - a.z,
    d = Math.hypot(dx, dz);
  if (d < TOP_RADIUS * 2) {
    const nx = d > 0.0001 ? dx / d : 1,
      nz = d > 0.0001 ? dz / d : 0;
    const overlap = TOP_RADIUS * 2 - d;
    const ma = a.bey.stats.weight / 70,
      mb = b.bey.stats.weight / 70;
    a.x -= (nx * overlap * mb) / (ma + mb);
    a.z -= (nz * overlap * mb) / (ma + mb);
    b.x += (nx * overlap * ma) / (ma + mb);
    b.z += (nz * overlap * ma) / (ma + mb);
    const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (rel > 0 && s.time > s.contactCooldown) {
      s.contactCooldown = s.time + 0.06;
      const j = rel * ((2 * ma * mb) / (ma + mb));
      for (const [attacker, defender, sign, mass, counter] of [
        [a, b, 1, mb, a.bey.type === "defense" && s.time < a.hitUntil ? 1.2 : 1],
        [b, a, -1, ma, b.bey.type === "defense" && s.time < b.hitUntil ? 1.2 : 1],
      ] as const) {
        const upper =
          attacker.bey.height <= 60 && defender.bey.height >= 80 ? 1.15 : 1;
        const hit =
          j *
          Math.max(
            0.3,
            1 + (attacker.bey.stats.atk - defender.bey.stats.def) / 100,
          ) *
          upper * COMBAT_STYLE[attacker.bey.type].force * COMBAT_STYLE[defender.bey.type].brace *
          counter;
        defender.vx += (sign * hit * nx * TUNING.knockback) / mass;
        defender.vz += (sign * hit * nz * TUNING.knockback) / mass;
        defender.hitUntil = s.time + TUNING.hitRecovery;
        defender.tilt = Math.min(1, defender.tilt + hit / 35);
        defender.rpm = Math.max(0, defender.rpm - hit * TUNING.impactSpin);
        const impact = hit / (1 + defender.bey.stats.def / 100);
        if (impact > 2.5)
          defender.burst -=
            (impact - 2.5) *
            TUNING.burstLoss *
            Math.pow(1 - defender.rpm, TUNING.burstExponent) *
            (s.time < attacker.dashUntil ? 2 : 1);
        attacker.impulse += hit;
        attacker.maxImpulse = Math.max(attacker.maxImpulse, hit);
      }
      if (a.bey.spin !== b.bey.spin) {
        const transfer = Math.min(0.012, Math.abs(a.rpm - b.rpm) * 0.1);
        if (a.rpm < b.rpm) {
          a.rpm += transfer;
          b.rpm -= transfer;
        } else {
          b.rpm += transfer;
          a.rpm -= transfer;
        }
      }
      s.events.push({
        type: "hit",
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        strength: j,
        player: 0,
        time: s.time,
      });
    }
  }
  if (s.time < PACING.minSeconds) {
    for (const t of s.tops) {
      // 開場保護作用於物理狀態，避免停轉、解體或出盤後仍等待結算。
      t.rpm = Math.max(t.rpm, PACING.reserveRpm);
      t.burst = Math.max(t.burst, t.bey.stats.burst * PACING.reserveBurstFraction);
      const r = Math.hypot(t.x, t.z), wall = RADIUS - TOP_RADIUS * 0.4;
      if (r > wall) {
        const nx = t.x / r, nz = t.z / r;
        const outward = Math.max(0, t.vx * nx + t.vz * nz);
        t.vx -= 1.65 * outward * nx;
        t.vz -= 1.65 * outward * nz;
        t.x = nx * wall; t.z = nz * wall;
      }
    }
  }
  const fa = finishFor(a),
    fb = finishFor(b);
  if (fa || fb) {
    const winner = fa && fb ? null : fa ? 1 : 0;
    const finish = fa ?? fb!;
    s.result = {
      winner,
      finish,
      points: winner === null ? 0 : FINISH[finish].points,
      time: s.time,
    };
    s.events.push({
      type: "finish",
      x: fa ? a.x : b.x,
      z: fa ? a.z : b.z,
      strength: 4,
      player: fa ? 0 : 1,
      time: s.time,
    });
  }
}
