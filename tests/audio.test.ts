import { test } from "node:test";
import assert from "node:assert/strict";
import { musicFor, musicVolume } from "../src/music-state.ts";

test("配樂依場景切換，暫停及背景分頁優先靜音", () => {
  const scene = { screen: "home", paused: false, hidden: false, finished: false, matchPoint: false };
  for (const screen of ["home", "catalog", "team", "launch", "stats"])
    assert.equal(musicFor({ ...scene, screen }), "menu");
  for (const screen of ["countdown", "battle", "replay"]) {
    assert.equal(musicFor({ ...scene, screen }), "battle");
    assert.equal(musicFor({ ...scene, screen, matchPoint: true }), "clutch");
    assert.equal(musicFor({ ...scene, screen, finished: true }), "results");
  }
  for (const screen of ["round", "results"]) assert.equal(musicFor({ ...scene, screen }), "results");
  assert.equal(musicFor({ ...scene, paused: true }), null);
  assert.equal(musicFor({ ...scene, hidden: true }), null);
});

test("音量限制於0至1，無效儲存值回到預設", () => {
  assert.equal(musicVolume(-1), 0);
  assert.equal(musicVolume(2), 1);
  assert.equal(musicVolume(0), 0);
  assert.equal(musicVolume(NaN), 0.6);
});
