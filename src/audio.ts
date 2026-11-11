import type { Battle, BattleEvent } from "./physics.ts";
export class Sound {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  rotors: { osc: OscillatorNode; gain: GainNode }[] = [];
  muted = false;
  lastBeat = -1;
  constructor() {
    try {
      this.muted = localStorage.getItem("spinforge-muted") === "true";
    } catch {
      /* 儲存禁用時仍可遊玩，音效設定只保留本次。 */
    }
  }
  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.18;
      this.master.connect(this.ctx.destination);
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
        osc.connect(filter).connect(gain).connect(stereo).connect(this.master);
        osc.start();
        this.rotors.push({ osc, gain });
      }
    }
    void this.ctx.resume();
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
        this.muted ? 0 : 0.18,
        this.ctx.currentTime,
        0.05,
      );
  }
  tone(
    freq: number,
    duration = 0.12,
    type: OscillatorType = "sine",
    volume = 0.6,
    slide = 0,
  ) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain(),
      now = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide)
      osc.frequency.exponentialRampToValueAtTime(slide, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.master);
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
    matchPoint: boolean,
    menu: boolean,
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
    if ((active || menu) && !this.muted) {
      const beat = Math.floor(this.ctx.currentTime * (active ? 3.5 : 2));
      if (beat !== this.lastBeat) {
        this.lastBeat = beat;
        const notes = menu
          ? [130.81, 164.81, 196, 164.81]
          : [65.41, 65.41, 77.78, 87.31];
        this.tone(notes[beat % 4], 0.14, "sine", menu ? 0.07 : 0.12);
        if (matchPoint && beat % 2 === 0)
          this.tone(523.25, 0.06, "triangle", 0.07);
      }
    }
  }
}
