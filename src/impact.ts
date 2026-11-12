import type { MusicMode } from "./music-state.ts";
export function impactProfile(strength: number) {
  const strengthSafe = Number.isFinite(strength) ? Math.max(0, Math.min(14, strength)) : 0;
  const energy = Math.sqrt(strengthSafe / 14);
  return {
    tier: (strengthSafe < 1 ? 0 : strengthSafe < 6 ? 1 : 2) as 0 | 1 | 2,
    gain: .36 + energy * 1.14,
    sparks: Math.round(4 + energy * 38),
    shake: Math.pow(energy, 1.5) * .007,
    duck: .72 - energy * .42,
  };
}
export function impactSamples(tier: 0 | 1 | 2, sampleRate: number) {
  const duration = [.12, .17, .23][tier];
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 9017 + tier, low = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += .2 * (noise - low);
    const bodyPhase = 2 * Math.PI * (65 * t + (105 + tier * 20) * .018 * (1 - Math.exp(-t / .018)));
    const metal = Math.sin(2 * Math.PI * (1780 - tier * 170) * t)
      + .6 * Math.sin(2 * Math.PI * (2879 - tier * 215) * t);
    const attack = Math.min(1, t / .0007);
    const tail = Math.min(1, (duration - t) / .012);
    samples[i] = attack * tail * (
      .46 * Math.sin(bodyPhase) * Math.exp(-t / (.021 + tier * .009))
      + .24 * metal * Math.exp(-t / (.019 + tier * .012))
      + .48 * (noise - low) * Math.exp(-t / (.009 + tier * .003))
    );
  }
  const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  for (let i = 0; i < samples.length; i++) samples[i] *= .84 / peak;
  return samples;
}
export function impactShake(age: number, amplitude: number, reduced: boolean) {
  if (reduced) return { x: 0, y: 0 };
  const envelope = amplitude * Math.exp(-Math.max(0, age) * 20);
  return { x: Math.sin(age * 83) * envelope, y: Math.sin(age * 67) * envelope * .55 };
}
export function musicLevel(volume: number, mode: MusicMode | null) {
  if (!mode) return 0;
  return volume * (["battle", "clutch"].includes(mode) ? .34 : .7);
}
