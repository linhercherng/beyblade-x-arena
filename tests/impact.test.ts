import { test } from "node:test";
import assert from "node:assert/strict";
import { impactProfile, impactSamples, impactShake, musicLevel } from "../src/impact.ts";

test("輕擦、碰撞、重擊逐級增加音量、火花與震動，異常強度有界", () => {
  const light = impactProfile(.5), mid = impactProfile(4), heavy = impactProfile(14);
  assert.equal(light.tier, 0);
  assert.equal(mid.tier, 1);
  assert.equal(heavy.tier, 2);
  for (const key of ["gain", "sparks", "shake"] as const) {
    assert.ok(light[key] < mid[key] && mid[key] < heavy[key], key);
  }
  assert.ok(light.duck > heavy.duck);
  assert.deepEqual(impactProfile(100000), heavy);
  assert.deepEqual(impactProfile(NaN), impactProfile(0));
});

test("合成撞擊不是純音，含有限且無削波的瞬態，尾部平滑收束", () => {
  for (const rate of [44100, 48000]) for (const tier of [0, 1, 2] as const) {
    const samples = impactSamples(tier, rate);
    assert.ok(samples.length >= rate * .1 && samples.length <= rate * .25);
    assert.ok(samples.every(Number.isFinite));
    assert.ok(Math.max(...samples.map(Math.abs)) <= .9);
    assert.ok(Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length) > .04);
    assert.equal(samples[0], 0);
    assert.ok(Math.abs(samples.at(-1)!) < .001);
  }
});

test("震動短促衰減、暫停同相位不漂移，減少動態時為零", () => {
  const kick = impactShake(.02, .007, false), tail = impactShake(.3, .007, false);
  assert.ok(Math.hypot(kick.x, kick.y) > Math.hypot(tail.x, tail.y) * 20);
  assert.deepEqual(impactShake(.02, .007, false), kick);
  assert.deepEqual(impactShake(.02, .007, true), { x: 0, y: 0 });
});

test("交戰配樂預留撞擊空間，最大音量與暫停仍受控", () => {
  assert.ok(musicLevel(1, "battle") <= .45);
  assert.ok(musicLevel(.6, "clutch") < musicLevel(.6, "menu"));
  assert.equal(musicLevel(0, "battle"), 0);
  assert.equal(musicLevel(1, null), 0);
});
