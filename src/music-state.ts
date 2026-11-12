export type MusicMode = "menu" | "battle" | "clutch" | "results";

export function musicFor(scene: {
  screen: string;
  paused: boolean;
  hidden: boolean;
  finished: boolean;
  matchPoint: boolean;
}): MusicMode | null {
  if (scene.paused || scene.hidden) return null;
  if (["round", "results"].includes(scene.screen)) return "results";
  if (["countdown", "battle", "replay"].includes(scene.screen))
    return scene.finished ? "results" : scene.matchPoint ? "clutch" : "battle";
  return "menu";
}

export function musicVolume(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.6;
}
