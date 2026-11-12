import type { Battle, Top } from "./physics.ts";

export type TopPose = Pick<Top, "x" | "z" | "rotation" | "rpm" | "tilt">;
export function capturePoses(battle: Battle): TopPose[] {
  return battle.tops.map(({ x, z, rotation, rpm, tilt }) => ({
    x,
    z,
    rotation,
    rpm,
    tilt,
  }));
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
  };
}
export function spinLean(tilt: number, rotation: number, player: number) {
  if (tilt === 0) return { x: 0, z: 0 };
  const lean = Math.min(0.28, Math.max(0, tilt) * 0.26),
    phase = rotation * 0.12 + player * 1.7;
  return { x: Math.sin(phase) * lean, z: Math.cos(phase) * lean };
}
