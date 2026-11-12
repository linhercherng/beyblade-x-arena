import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const sampleRate = 44100;
const tracks = {
  menu: { title: "靜電工坊", bpm: 112, bars: 32, kind: "menu", seed: 91271 },
  battle: {
    title: "鋼翼交鋒",
    bpm: 144,
    bars: 32,
    kind: "battle",
    seed: 63829,
  },
  clutch: {
    title: "最後一擊",
    bpm: 144,
    bars: 16,
    kind: "clutch",
    seed: 22913,
  },
  results: {
    title: "餘光凱歌",
    bpm: 104,
    bars: 16,
    kind: "results",
    seed: 77351,
  },
};
mkdirSync("public/audio", { recursive: true });
mkdirSync("artifacts/audio", { recursive: true });
const pi = Math.PI * 2,
  midi = (n) => 440 * 2 ** ((n - 69) / 12);
function run(command, args) {
  const r = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(r.stderr || `${command} failed`);
  return r.stdout;
}
function pcmWav(left, right) {
  const length = left.length,
    buffer = Buffer.alloc(44 + length * 4);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(length * 4, 40);
  for (let i = 0; i < length; i++) {
    buffer.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, left[i])) * 32767),
      44 + i * 4,
    );
    buffer.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, right[i])) * 32767),
      46 + i * 4,
    );
  }
  return buffer;
}
function render(track) {
  const beat = 60 / track.bpm,
    bar = beat * 4,
    length = Math.round(track.bars * bar * sampleRate);
  const left = new Float32Array(length),
    right = new Float32Array(length),
    sendLeft = new Float32Array(length),
    sendRight = new Float32Array(length);
  let seed = track.seed;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  const energetic = track.kind === "battle" || track.kind === "clutch";
  function event(at, duration, instrument, freq, volume, pan = 0) {
    const start = Math.round(at * sampleRate),
      count = Math.ceil(duration * sampleRate),
      l = Math.sqrt((1 - pan) / 2),
      r = Math.sqrt((1 + pan) / 2);
    let noisePrevious = 0;
    for (let j = 0; j < count; j++) {
      const t = j / sampleRate,
        x = t / duration,
        phase = pi * freq * t,
        noise = random();
      let v = 0;
      if (instrument === "pad") {
        const envelope = Math.min(1, t / 0.16, (duration - t) / 0.3);
        const detune = phase * (1 + 0.0018 * Math.sin(t * 2.7));
        v =
          (Math.sin(phase) * 0.62 +
            Math.sin(detune + 0.17) * 0.24 +
            Math.sin(phase * 2) * 0.09 +
            Math.sin(phase * 3) * 0.045) *
          Math.max(0, envelope);
        if (energetic)
          v *= 0.55 + 0.45 * (1 - Math.exp((-((at + t) % beat) / beat) * 14));
      } else if (instrument === "pluck") {
        v =
          (Math.sin(phase) +
            0.22 * Math.sin(phase * 2) +
            0.075 * Math.sin(phase * 3)) *
          (1 - Math.exp(-t * 650)) *
          Math.exp(-t * 10);
      } else if (instrument === "lead") {
        const p = phase + 0.025 * Math.sin(t * 31);
        v =
          (Math.sin(p) + 0.28 * Math.sin(p * 2) + 0.075 * Math.sin(p * 3)) *
          (1 - Math.exp(-t * 300)) *
          Math.min(1, (duration - t) / 0.07) *
          Math.exp(-t * 0.9);
      } else if (instrument === "bass") {
        v =
          (Math.sin(phase) +
            0.32 * Math.sin(phase * 2) +
            0.12 * Math.sin(phase * 3)) *
          (1 - Math.exp(-t * 350)) *
          Math.min(1, (duration - t) / 0.05) *
          Math.exp(-t * 1.2);
      } else if (instrument === "kick") {
        const p = pi * (49 * t + 115 * 0.024 * (1 - Math.exp(-t / 0.024)));
        v =
          Math.sin(p) * Math.exp(-t * 11) + noise * 0.055 * Math.exp(-t * 180);
      } else if (instrument === "snare") {
        v =
          (noise - noisePrevious * 0.6) * Math.exp(-t * 19) * 0.62 +
          (Math.sin(pi * 185 * t) + 0.25 * Math.sin(pi * 330 * t)) *
            Math.exp(-t * 22) *
            0.38;
      } else if (instrument === "hat") {
        v =
          (noise - noisePrevious) *
          Math.exp(-t * (track.kind === "menu" ? 75 : 95)) *
          0.38;
      } else if (instrument === "openhat") {
        v = (noise - noisePrevious) * Math.exp(-t * 18) * 0.3;
      } else if (instrument === "clap") {
        const burst = [0, 0.013, 0.028].reduce(
          (s, d) => s + (t >= d ? Math.exp(-(t - d) * 90) : 0),
          0,
        );
        v = (noise - noisePrevious * 0.75) * burst * 0.32;
      } else if (instrument === "crash") {
        v =
          (noise - noisePrevious * 0.7) *
          (1 - Math.exp(-t * 450)) *
          Math.exp(-t * 4.5) *
          0.4;
      }
      noisePrevious = noise;
      const index = (start + j) % length,
        value = v * volume;
      left[index] += value * l;
      right[index] += value * r;
      if (["pad", "pluck", "lead"].includes(instrument)) {
        const amount = instrument === "pad" ? 0.12 : 0.24;
        sendLeft[index] += value * l * amount;
        sendRight[index] += value * r * amount;
      }
    }
  }
  const progression =
    track.kind === "results" ? [48, 55, 50, 52] : [40, 48, 43, 50];
  const motifA = [7, 10, 14, 12, 10, 7, 5, 7],
    motifB = [14, 17, 14, 12, 10, 12, 7, 5];
  for (let b = 0; b < track.bars; b++) {
    const phrase = Math.floor(b / 8),
      root = progression[Math.floor(b / 2) % 4],
      at = b * bar,
      major = [48, 43, 50, 55].includes(root),
      chord = [root + 12, root + (major ? 16 : 15), root + 19];
    const padLevel =
      track.kind === "menu" ? 0.11 : track.kind === "results" ? 0.14 : 0.075;
    chord.forEach((n, i) =>
      event(at, bar + 0.34, "pad", midi(n), padLevel, (i - 1) * 0.42),
    );
    const bassPattern = energetic ? [0, 0, 7, 0, 12, 0, 7, 0] : [0, 7, 0, 12];
    bassPattern.forEach((offset, i) =>
      event(
        at + (i * bar) / bassPattern.length,
        (bar / bassPattern.length) * 0.78,
        "bass",
        midi(root - 12 + offset),
        energetic ? 0.2 : 0.12,
      ),
    );
    const drum =
      track.kind === "results"
        ? 0.42
        : track.kind === "menu"
          ? 0.52
          : track.kind === "clutch"
            ? 1
            : 0.86;
    const kicks = energetic ? [0, 6, 8, 11] : [0, 8];
    for (const step of kicks)
      event(at + (step * beat) / 4, 0.42, "kick", 0, 0.36 * drum);
    for (const step of [4, 12]) {
      event(at + (step * beat) / 4, 0.22, "snare", 0, 0.24 * drum);
      event(at + (step * beat) / 4, 0.13, "clap", 0, 0.09 * drum);
    }
    for (let step = 0; step < 16; step += track.kind === "clutch" ? 1 : 2)
      event(
        at + (step * beat) / 4,
        0.09,
        "hat",
        0,
        (step % 4 === 2 ? 0.14 : 0.085) * drum,
        step % 4 === 0 ? -0.23 : 0.23,
      );
    if (energetic)
      event(at + (14 * beat) / 4, 0.28, "openhat", 0, 0.12 * drum, 0.3);
    if (b % 8 === 0) event(at, 1.1, "crash", 0, 0.12 * drum, -0.25);
    if (b % 8 === 7)
      for (const [i, step] of [13, 14, 15].entries())
        event(
          at + (step * beat) / 4,
          0.14,
          "snare",
          0,
          (0.1 + i * 0.035) * drum,
          (i - 1) * 0.2,
        );
    const arpSteps = energetic ? 8 : track.kind === "menu" ? 8 : 4;
    for (let i = 0; i < arpSteps; i++) {
      const octave = phrase % 2 && i % 4 === 3 ? 12 : 0,
        n = chord[(i + b) % 3] + 12 + octave;
      event(
        at + (i * bar) / arpSteps,
        0.34,
        "pluck",
        midi(n),
        energetic ? 0.073 : 0.095,
        i % 2 ? -0.48 : 0.48,
      );
    }
    const melody = phrase % 2 ? motifB : motifA;
    if (
      b % 2 === 0 &&
      (energetic || phrase % 2 === 1 || track.kind === "results")
    ) {
      for (let i = 0; i < melody.length; i++) {
        if (i === 3 && b % 4 === 2) continue;
        const n =
          52 +
          melody[(i + Math.floor(b / 8)) % melody.length] +
          (track.kind === "clutch" && b >= 8 ? 12 : 0);
        event(
          at + i * beat,
          0.4 * beat + (i === 7 ? 0.24 : 0),
          "lead",
          midi(n),
          track.kind === "menu"
            ? 0.075
            : track.kind === "results"
              ? 0.09
              : 0.085,
          i % 2 ? 0.12 : -0.12,
        );
      }
    }
  }
  const delay = Math.round(beat * 0.75 * sampleRate);
  for (let i = 0; i < length; i++)
    for (const [multiple, gain] of [
      [1, 0.48],
      [2, 0.23],
      [3, 0.11],
    ]) {
      const index = (i - delay * multiple + length * 2) % length;
      left[i] += (multiple % 2 ? sendRight[index] : sendLeft[index]) * gain;
      right[i] += (multiple % 2 ? sendLeft[index] : sendRight[index]) * gain;
    }
  for (const [seconds, gain] of [
    [0.041, 0.16],
    [0.073, 0.12],
    [0.109, 0.09],
    [0.173, 0.06],
  ]) {
    const offset = Math.round(seconds * sampleRate);
    for (let i = 0; i < length; i++) {
      const j = (i - offset + length) % length;
      left[i] += sendRight[j] * gain;
      right[i] += sendLeft[j] * gain;
    }
  }
  let peak = 0;
  for (let i = 0; i < length; i++) {
    left[i] = Math.tanh(left[i] * 1.3);
    right[i] = Math.tanh(right[i] * 1.3);
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const gain = 0.78 / peak;
  let sum = 0;
  const edge = Math.round(0.012 * sampleRate);
  for (let i = 0; i < length; i++) {
    const position = Math.max(
        0,
        Math.min(1, i / edge, (length - 1 - i) / edge),
      ),
      taper = 0.5 - 0.5 * Math.cos(Math.PI * position);
    left[i] *= gain * taper;
    right[i] *= gain * taper;
    sum += left[i] * left[i] + right[i] * right[i];
  }
  const seam = Math.max(
    Math.abs(left[0] - left.at(-1)),
    Math.abs(right[0] - right.at(-1)),
  );
  assert.ok(sum / length > 0.001);
  assert.ok(seam < 0.05, `${track.kind} loop seam ${seam}`);
  return {
    left,
    right,
    stats: {
      samples: length,
      duration: length / sampleRate,
      peak: 0.78,
      rms: Math.sqrt(sum / length / 2),
      seam,
    },
  };
}
const manifest = {},
  report = {};
for (const [id, track] of Object.entries(tracks)) {
  const { left, right, stats } = render(track),
    wav = `artifacts/audio/${id}.wav`,
    mp3 = `public/audio/${id}.mp3`,
    decoded = `artifacts/audio/${id}-decoded.f32`;
  writeFileSync(wav, pcmWav(left, right));
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    wav,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "160k",
    "-write_xing",
    "1",
    "-metadata",
    `title=${track.title}`,
    "-metadata",
    "artist=SPINFORGE Original Score",
    mp3,
  ]);
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    mp3,
    "-f",
    "f32le",
    "-acodec",
    "pcm_f32le",
    decoded,
  ]);
  const bytes = readFileSync(decoded),
    count = bytes.length / 8;
  assert.equal(count, stats.samples, `${id} decoded sample count`);
  let decodedPeak = 0,
    energy = 0;
  for (let i = 0; i < bytes.length; i += 4) {
    const v = bytes.readFloatLE(i);
    assert.ok(Number.isFinite(v));
    decodedPeak = Math.max(decodedPeak, Math.abs(v));
    energy += v * v;
  }
  const decodedSeam = Math.max(
    Math.abs(bytes.readFloatLE(0) - bytes.readFloatLE(bytes.length - 8)),
    Math.abs(bytes.readFloatLE(4) - bytes.readFloatLE(bytes.length - 4)),
  );
  assert.ok(decodedPeak < 0.9, `${id} decoded peak`);
  assert.ok(decodedSeam < 0.01, `${id} decoded seam`);
  manifest[id] = {
    src: `/audio/${id}.mp3`,
    title: track.title,
    bpm: track.bpm,
    duration: stats.duration,
    loop: true,
    credit:
      "SPINFORGE 原創合成配樂；程式作曲、合成與混音，未使用第三方錄音或旋律樣本。",
  };
  const probe = JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration,bit_rate:stream=sample_rate,channels",
      "-of",
      "json",
      mp3,
    ]),
  );
  report[id] = {
    ...stats,
    decodedPeak,
    decodedRms: Math.sqrt(energy / (bytes.length / 4)),
    decodedSeam,
    mp3Bytes: statSync(mp3).size,
    bars: track.bars,
    containerDuration: Number(probe.format.duration),
    sampleRate: Number(probe.streams[0].sample_rate),
    channels: probe.streams[0].channels,
  };
  console.log(id, JSON.stringify(report[id]));
}
writeFileSync(
  "src/music-tracks.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
writeFileSync(
  "artifacts/audio/verification.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Total MP3 bytes",
  Object.values(report).reduce((n, r) => n + r.mp3Bytes, 0),
);

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const browserReport = {};
try {
  const page = await browser.newPage();
  for (const [id, track] of Object.entries(manifest)) {
    browserReport[id] = [];
    for (const rate of [44100, 48000]) {
      const decoded = await page.evaluate(
        async ({ base64, rate }) => {
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const context = new OfflineAudioContext(2, 1, rate),
            audio = await context.decodeAudioData(bytes.buffer);
          const left = audio.getChannelData(0),
            right = audio.getChannelData(1);
          let peak = 0;
          for (let i = 0; i < audio.length; i++)
            peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
          return {
            sampleRate: audio.sampleRate,
            samples: audio.length,
            duration: audio.duration,
            peak,
            seam: Math.max(
              Math.abs(left[0] - left.at(-1)),
              Math.abs(right[0] - right.at(-1)),
            ),
          };
        },
        { base64: readFileSync("public" + track.src).toString("base64"), rate },
      );
      assert.ok(
        Math.abs(decoded.samples - Math.round(track.duration * rate)) <= 1,
        `${id} browser duration at ${rate}`,
      );
      assert.ok(
        decoded.peak < 0.9 && decoded.seam < 0.01,
        `${id} browser amplitude at ${rate}`,
      );
      browserReport[id].push(decoded);
    }
  }
} finally {
  await browser.close();
}
writeFileSync(
  "artifacts/audio/browser-verification.json",
  JSON.stringify(browserReport, null, 2) + "\n",
);
console.log("Chrome 44.1/48 kHz decode and loop-boundary checks passed");
