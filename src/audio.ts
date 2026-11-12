import type { Battle, BattleEvent, Result } from "./physics.ts";
import { cueSamples, FINISH_RECOVERY, type Cue } from "./finish.ts";
import tracks from "./music-tracks.json";
import { musicVolume, type MusicMode } from "./music-state.ts";
import { impactProfile, impactSamples, musicLevel } from "./impact.ts";
import { dashSamples, hasRail } from "./dash.ts";

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
  musicDuck: GainNode | null = null;
  volume = 0.6;
  requested: MusicMode | null = null;
  playing: Playing | null = null;
  private pending: MusicMode | null = null;
  private revision = 0;
  private buffers = new Map<MusicMode, Promise<AudioBuffer>>();
  private failed = new Set<MusicMode>();
  private offsets = new Map<MusicMode, number>();
  private strikes: AudioBuffer[] = [];
  private impacts = new Map<AudioBufferSourceNode,GainNode>();
  private impactTails = new Map<AudioBufferSourceNode,GainNode>();
  private lastImpact = -Infinity;
  private lastStrength = 0;
  private cueBuffers = new Map<Cue, AudioBuffer>();
  private cues = new Map<AudioBufferSourceNode, GainNode>();
  private dashBuffers = new Map<boolean,AudioBuffer>();
  private dashVoices = new Map<number,{source:AudioBufferSourceNode;gain:GainNode}>();
  private lastDash = [-Infinity,-Infinity];
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
      this.music.gain.value = musicLevel(this.volume, this.requested);
      this.musicDuck = this.ctx.createGain();
      this.music.connect(this.musicDuck).connect(this.master);
      this.strikes = ([0, 1, 2] as const).map(tier => {
        const samples = impactSamples(tier, this.ctx!.sampleRate);
        const buffer = this.ctx!.createBuffer(1, samples.length, this.ctx!.sampleRate);
        buffer.getChannelData(0).set(samples);
        return buffer;
      });
      // 在使用者啟用音訊時預熱，避免第一次衝刺在交戰迴圈內合成波形。
      for(const grip of [false,true]) {
        const samples=dashSamples(this.ctx.sampleRate,grip);
        const buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);
        buffer.getChannelData(0).set(samples);this.dashBuffers.set(grip,buffer);
      }
      for(const kind of ["burst","over","extreme","spin","draw"] as const) {
        const samples=cueSamples(kind,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);
        buffer.getChannelData(0).set(samples);this.cueBuffers.set(kind,buffer);
      }
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
    if (this.muted) { this.stopCues(); this.stopDashes(); this.stopImpacts(); }
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
      this.music.gain.setTargetAtTime(musicLevel(this.volume, this.requested), this.ctx.currentTime, 0.04);
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
  event(e: BattleEvent, dashHit=false) {
    if (e.type === "hit") {
      if (!this.ctx || !this.sfx || !this.musicDuck || this.muted) return;
      const now = this.ctx.currentTime;
      // 為衝刺命中保留一聲部，普通擦撞的節流不應吞掉主撞擊聲。
      if (this.impacts.size >= (dashHit?6:5) || (!dashHit && now - this.lastImpact < .035 && e.strength <= this.lastStrength)) return;
      this.lastImpact = now;
      this.lastStrength = e.strength;
      const profile = impactProfile(dashHit ? Math.max(10,e.strength*1.35) : e.strength);
      const source = this.ctx.createBufferSource(), gain = this.ctx.createGain(), pan = this.ctx.createStereoPanner();
      source.buffer = this.strikes[profile.tier];
      source.playbackRate.value = dashHit ? .8 : 1 + Math.sin(e.time * 17 + e.x) * .04;
      gain.gain.value = profile.gain*(dashHit?1.1:1);
      pan.pan.value = Math.max(-.85, Math.min(.85, e.x / 5));
      source.connect(gain).connect(pan).connect(this.sfx);
      this.impacts.set(source,gain);
      source.onended = () => { source.disconnect(); gain.disconnect(); pan.disconnect(); this.impacts.delete(source);this.impactTails.delete(source); };
      source.start();
      const duck = this.musicDuck.gain;
      duck.cancelAndHoldAtTime(now);
      duck.linearRampToValueAtTime(Math.min(duck.value, dashHit?.18:profile.duck), now + .004);
      duck.setTargetAtTime(1, now + (dashHit?.15:.08), .085);
    }
    if (e.type === "dash") this.playDash(e);
    if (e.type === "shout") {
      this.tone(330, 0.25, "triangle", 0.6, 990);
    }
  }
  private stopImpacts(seconds=.015) {
    if(!this.ctx)return;
    const now=this.ctx.currentTime;
    for(const [source,gain] of this.impactTails) {
      gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+.015);source.stop(now+.015);
    }
    this.impactTails.clear();
    for(const [source,gain] of this.impacts) {
      gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+seconds);
      source.stop(now+seconds);
      if(seconds>.015)this.impactTails.set(source,gain);
    }
    this.impacts.clear();
  }
  private stopDashes() {
    if(!this.ctx)return;
    const now=this.ctx.currentTime;
    for(const {source,gain} of this.dashVoices.values()) {
      gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+.015);
      source.stop(now+.015);
    }
    this.dashVoices.clear();
  }
  private playDash(e:BattleEvent) {
    if(!this.ctx||!this.sfx||this.muted||(e.player!==0&&e.player!==1))return;
    const now=this.ctx.currentTime;
    if(now-this.lastDash[e.player]<.12)return;
    this.lastDash[e.player]=now;
    const grip=hasRail(e.x,e.z);
    const old=this.dashVoices.get(e.player);
    if(old) { old.gain.gain.cancelAndHoldAtTime(now);old.gain.gain.linearRampToValueAtTime(0,now+.015);old.source.stop(now+.015); }
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();
    source.buffer=this.dashBuffers.get(grip)!;gain.gain.value=.95;
    pan.pan.value=Math.max(-.8,Math.min(.8,e.x/5));
    source.connect(gain).connect(pan).connect(this.sfx);
    this.dashVoices.set(e.player,{source,gain});
    source.onended=()=>{source.disconnect();gain.disconnect();pan.disconnect();if(this.dashVoices.get(e.player)?.source===source)this.dashVoices.delete(e.player);};
    source.start(now+.008);
    if(this.musicDuck) {
      const duck=this.musicDuck.gain;duck.cancelAndHoldAtTime(now);
      duck.linearRampToValueAtTime(Math.min(duck.value,.18),now+.004);
      duck.setTargetAtTime(1,now+.22,.12);
    }
  }
  private stopCues() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.cues.forEach((gain, source) => {
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.linearRampToValueAtTime(0, now + .015);
      source.stop(now + .015);
    });
    this.cues.clear();
  }
  private playCue(kind: Cue, initialRate=1, slowReplay=false) {
    if (!this.ctx || !this.sfx || this.muted) return;
    this.stopImpacts(initialRate<1?.065:.015);
    this.stopDashes();
    this.stopCues();
    if (!this.cueBuffers.has(kind)) {
      const samples = cueSamples(kind, this.ctx.sampleRate);
      const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
      buffer.getChannelData(0).set(samples);
      this.cueBuffers.set(kind, buffer);
    }
    const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
    source.buffer = this.cueBuffers.get(kind)!;
    const now=this.ctx.currentTime;
    source.playbackRate.setValueAtTime(initialRate,now);
    if(!slowReplay)source.playbackRate.linearRampToValueAtTime(1,now+FINISH_RECOVERY);
    gain.gain.setValueAtTime(initialRate<1?0:1.2,now);
    if(initialRate<1)gain.gain.linearRampToValueAtTime(1.2,now+.035);
    source.connect(gain).connect(this.sfx);
    this.cues.set(source, gain);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.cues.delete(source); };
    source.start();
    if (this.musicDuck) {
      const duck = this.musicDuck.gain;
      duck.cancelAndHoldAtTime(now);
      duck.linearRampToValueAtTime(Math.min(duck.value,.25), now + .015);
      duck.setTargetAtTime(1, now + (slowReplay?source.buffer.duration/initialRate:initialRate<1?1.45:.65), .12);
    }
  }
  finish(result: Result, initialRate=1, slowReplay=false) { this.playCue(result.winner === null ? "draw" : result.finish,initialRate,slowReplay); }
  stopEffects() {this.stopImpacts();this.stopDashes();this.stopCues();}
  victory(won: boolean) { this.playCue(won ? "victory" : "defeat"); }
  update(
    battle: Battle | null,
    active: boolean,
    mode: MusicMode | null,
  ) {
    if (!this.ctx) return;
    if(mode===null||mode==="menu") { this.stopDashes();this.stopImpacts(); }
    if (mode !== this.requested && (mode === null || mode === "menu")) this.stopCues();
    if (mode !== this.requested)
      this.music?.gain.setTargetAtTime(musicLevel(this.volume, mode), this.ctx.currentTime, .06);
    this.rotors.forEach((r, i) => {
      r.osc.frequency.setTargetAtTime(
        45 + (battle?.tops[i].rpm ?? 0) * 135 + (active && battle && battle.tops[i].dashUntil>battle.time ? 120 : 0),
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
