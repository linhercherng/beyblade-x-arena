import type { Battle, Top } from "./physics.ts";

export type TopPose = Pick<Top, "x" | "z" | "rotation" | "rpm" | "tilt" | "axisX" | "axisZ">;
export function capturePoses(battle: Battle, reuse: TopPose[] = []): TopPose[] {
  battle.tops.forEach(({ x, z, rotation, rpm, tilt, axisX,axisZ }, i) => {
    const pose = (reuse[i] ??= { x: 0, z: 0, rotation: 0, rpm: 0, tilt: 0 });
    pose.x = x;
    pose.z = z;
    pose.rotation = rotation;
    pose.rpm = rpm;
    pose.tilt = tilt;
    if(axisX===undefined){delete pose.axisX;delete pose.axisZ;}else{pose.axisX=axisX;pose.axisZ=axisZ;}
  });
  return reuse;
}
export function damping(dt: number, rate: number) {
  return 1 - Math.exp(-Math.max(0, dt) * rate);
}
export function entryPose(seconds: number, omega: number, reduced = false) {
  const t = Math.max(0, Math.min(3, seconds));
  if (reduced) return { height: 0, rotation: 0, pulse: 0, phase: "ready" };
  const phase =
    t < 1.8 ? "hover" : t < 2.45 ? "drop" : t < 2.65 ? "bounce" : "ready";
  const fall = Math.max(0, Math.min(1, (t - 1.8) / 0.65)),
    bounce = Math.max(0, Math.min(1, (t - 2.45) / 0.2));
  const height =
    t < 2.45 ? 2.2 * (1 - fall * fall) : 0.08 * 4 * bounce * (1 - bounce);
  return {
    height,
    rotation: t === 3 ? 0 : (t - 3) * omega,
    pulse: t >= 2.45 && t < 2.85 ? 1 - (t - 2.45) / 0.4 : 0,
    phase,
  };
}
export function interpolatePose(
  previous: TopPose,
  current: TopPose,
  alpha: number,
): TopPose {
  const a = Math.max(0, Math.min(1, alpha));
  return {
    x: previous.x + (current.x - previous.x) * a,
    z: previous.z + (current.z - previous.z) * a,
    rotation: previous.rotation + (current.rotation - previous.rotation) * a,
    rpm: previous.rpm + (current.rpm - previous.rpm) * a,
    tilt: previous.tilt + (current.tilt - previous.tilt) * a,
    ...(current.axisX===undefined?{}:{axisX:(previous.axisX??current.axisX)+((current.axisX)-(previous.axisX??current.axisX))*a,
      axisZ:(previous.axisZ??current.axisZ??0)+((current.axisZ??0)-(previous.axisZ??current.axisZ??0))*a}),
  };
}
export function spinLean(tilt: number, rotation: number, player: number) {
  if (tilt === 0) return { x: 0, z: 0 };
  const lean = Math.min(0.28, Math.max(0, tilt) * 0.26),
    phase = rotation * 0.12 + player * 1.7;
  return { x: Math.sin(phase) * lean, z: Math.cos(phase) * lean };
}
