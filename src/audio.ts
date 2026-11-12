import type { Battle, BattleEvent } from "./physics.ts";
import tracks from "./music-tracks.json";
import { musicVolume, type MusicMode } from "./music-state.ts";

type Playing = {
  mode: MusicMode;
  source: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  offset: number;
  duration: number;
};

export class Sound {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  rotors: { osc: OscillatorNode; gain: GainNode }[] = [];
  muted = false;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  volume = 0.6;
  requested: MusicMode | null = null;
  playing: Playing | null = null;
  private pending: MusicMode | null = null;
  private revision = 0;
  private buffers = new Map<MusicMode, Promise<AudioBuffer>>();
  private failed = new Set<MusicMode>();
  private offsets = new Map<MusicMode, number>();
  constructor() {
    try {
      this.muted = localStorage.getItem("spinforge-muted") === "true";
      const saved = localStorage.getItem("spinforge-music-volume");
      if (saved !== null) this.volume = musicVolume(Number(saved));
    } catch {
      /* 儲存禁用時仍可遊玩，音效設定只保留本次。 */
    }
  }
  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.65;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.15;
      this.master.connect(limiter).connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.27;
      this.sfx.connect(this.master);
      this.music = this.ctx.createGain();
      this.music.gain.value = this.volume;
      this.music.connect(this.master);
      for (const pan of [-0.6, 0.6]) {
        const osc = this.ctx.createOscillator(),
          gain = this.ctx.createGain(),
          stereo = this.ctx.createStereoPanner();
        osc.type = "sawtooth";
        osc.frequency.value = 80;
        gain.gain.value = 0;
        stereo.pan.value = pan;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 650;
        osc.connect(filter).connect(gain).connect(stereo).connect(this.sfx!);
        osc.start();
        this.rotors.push({ osc, gain });
      }
    }
    void this.ctx.resume().catch(() => { /* 下一次操作可再次啟用音訊。 */ });
  }
  toggle() {
    this.muted = !this.muted;
    try {
      localStorage.setItem("spinforge-muted", String(this.muted));
    } catch {
      /* 音效偏好寫入失敗不阻止操作。 */
    }
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : 0.65,
        this.ctx.currentTime,
        0.05,
      );
  }
  setMusicVolume(value: number) {
    this.volume = musicVolume(value);
    try { localStorage.setItem("spinforge-music-volume", String(this.volume)); } catch { /* 暫存設定。 */ }
    if (this.ctx && this.music)
      this.music.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
  }
  private buffer(mode: MusicMode) {
    if (!this.buffers.has(mode)) {
      const buffer = fetch(tracks[mode].src).then(async (response) => {
        if (!response.ok) throw new Error(`配樂 ${response.status}`);
        return this.ctx!.decodeAudioData(await response.arrayBuffer());
      });
      this.buffers.set(mode, buffer);
      // shortcut: 快取兩首解碼音訊，更多曲目時再評估行動裝置記憶體。
      if (this.buffers.size > 2) this.buffers.delete(this.buffers.keys().next().value!);
    }
    return this.buffers.get(mode)!;
  }
  private fadeOut(seconds: number) {
    const old = this.playing;
    if (!old || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.offsets.set(old.mode, (old.offset + now - old.startedAt) % old.duration);
    old.gain.gain.cancelAndHoldAtTime(now);
    old.gain.gain.linearRampToValueAtTime(0, now + seconds);
    old.source.stop(now + seconds);
    this.playing = null;
  }
  private async transition(mode: MusicMode | null) {
    if (!this.ctx || !this.music || (mode !== null && mode === this.pending)) return;
    if (mode === this.playing?.mode) {
      this.pending = null;
      this.revision++;
      return;
    }
    const revision = ++this.revision;
    this.pending = mode;
    if (!mode) {
      this.fadeOut(0.18);
      return;
    }
    try {
      const buffer = await this.buffer(mode);
      if (revision !== this.revision) return;
      const now = this.ctx.currentTime;
      const duration = Math.min(buffer.duration, tracks[mode].duration);
      let offset = this.offsets.get(mode) ?? 0;
      const old = this.playing;
      if (old && ["battle", "clutch"].includes(old.mode) && ["battle", "clutch"].includes(mode))
        offset = (old.offset + now - old.startedAt) % duration;
      this.fadeOut(0.5);
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = duration;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + 0.5);
      source.connect(gain).connect(this.music);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start(now, offset % duration);
      this.playing = { mode, source, gain, startedAt: now, offset, duration };
    } catch (error) {
      this.failed.add(mode);
      if (revision === this.revision) this.fadeOut(0.18);
      console.warn(`無法載入配樂 ${mode}，仍可使用遊戲音效。`, error);
    } finally {
      if (revision === this.revision) this.pending = null;
    }
  }
  tone(
    freq: number,
    duration = 0.12,
    type: OscillatorType = "sine",
    volume = 0.6,
    slide = 0,
  ) {
    if (!this.ctx || !this.sfx) return;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain(),
      now = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide)
      osc.frequency.exponentialRampToValueAtTime(slide, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.sfx);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start();
    osc.stop(now + duration);
  }
  event(e: BattleEvent) {
    if (e.type === "hit") {
      this.tone(
        180 + e.strength * 26,
        0.08,
        "triangle",
        Math.min(0.8, e.strength * 0.08),
        55,
      );
      this.tone(1400, 0.045, "square", 0.1, 300);
    }
    if (e.type === "dash") this.tone(240, 0.45, "sawtooth", 0.22, 1600);
    if (e.type === "shout") {
      this.tone(330, 0.25, "triangle", 0.6, 990);
    }
    if (e.type === "finish") {
      this.tone(90, 0.5, "sine", 1, 30);
      this.tone(523, 0.18, "triangle", 0.6);
      setTimeout(() => this.tone(784, 0.4, "triangle", 0.5), 160);
    }
  }
  update(
    battle: Battle | null,
    active: boolean,
    mode: MusicMode | null,
  ) {
    if (!this.ctx) return;
    this.rotors.forEach((r, i) => {
      r.osc.frequency.setTargetAtTime(
        45 + (battle?.tops[i].rpm ?? 0) * 135,
        this.ctx!.currentTime,
        0.08,
      );
      r.gain.gain.setTargetAtTime(
        active ? (battle?.tops[i].rpm ?? 0) * 0.08 : 0,
        this.ctx!.currentTime,
        0.08,
      );
    });
    this.requested = mode;
    const next = this.muted || this.volume === 0 || (mode && this.failed.has(mode)) ? null : mode;
    if (next !== (this.playing?.mode ?? null) || this.pending)
      void this.transition(next);
  }
}
