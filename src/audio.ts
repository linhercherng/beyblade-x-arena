import type { Battle, BattleEvent, Result } from "./physics.ts";
import { cueSamples, FINISH_RECOVERY, type Cue } from "./finish.ts";
import tracks from "./music-tracks.json" with {type:"json"};
import { musicVolume, type MusicMode } from "./music-state.ts";
import { impactProfile, impactSamples, musicLevel } from "./impact.ts";
import { dashSamples, hasRail } from "./dash.ts";
import { replayMix, replayAccentSamples, type ReplayStage } from "./replay-audio.ts";

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
  private replayGain: GainNode | null = null;
  private replayFilter: BiquadFilterNode | null = null;
  private replayStage: ReplayStage | null = null;
  private replayPan=0;
  private replayAccents=new Map<"impact"|"decision",AudioBuffer>();
  private replayPlayed=new Set<"impact"|"decision">();
  private replayAccent:{source:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode}|null=null;
  private cuePans=new Map<AudioBufferSourceNode,StereoPannerNode>();
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
  private background=false;
  private recovering=true;
  private recovery=0;
  private lastResume=-Infinity;
  private sources=new Set<AudioScheduledSourceNode>();
  private get ready(){return !!this.ctx&&this.ctx.state==="running"&&!this.background&&!this.recovering;}
  private track<T extends AudioScheduledSourceNode>(source:T):T{
    this.sources.add(source);source.addEventListener("ended",()=>this.sources.delete(source),{once:true});return source;
  }
  private silence(){
    if(!this.ctx||!this.master)return;
    this.recovering=true;this.recovery++;this.lastResume=-Infinity;
    const now=this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(0,now);
    this.revision++;this.pending=null;this.fadeOut(0);this.stopEffects();
    // 包含交叉淡出中的配樂與短音效，避免凍結的聲源在恢復時一起響起。
    for(const source of this.sources){source.stop(now);source.disconnect();}this.sources.clear();
    for(const rotor of this.rotors){rotor.gain.gain.cancelScheduledValues(now);rotor.gain.gain.setValueAtTime(0,now);}
    this.lastImpact=-Infinity;this.lastDash=[-Infinity,-Infinity];
  }
  private restore(){
    if(!this.ctx||!this.master||this.background||this.ctx.state!=="running"||!this.recovering)return;
    this.recovering=false;
    const now=this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(0,now);
    this.master.gain.linearRampToValueAtTime(this.muted?0:.65,now+.25);
  }
  setBackground(hidden:boolean){
    if(hidden===this.background)return;
    this.background=hidden;
    if(hidden){this.silence();if(this.ctx&&this.ctx.state!=="suspended"&&this.ctx.state!=="closed")void this.ctx.suspend().catch(()=>{});}
    // 回到前景保留靜音，下一次操作在使用者手勢內恢復。
  }
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
    if(this.background||typeof AudioContext==="undefined")return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.ctx.addEventListener("statechange",()=>{
        if(this.ctx?.state!=="running"){if(!this.recovering)this.silence();}
        else if(this.lastResume!==-Infinity)this.restore();
      });
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
      this.replayGain=this.ctx.createGain();this.replayFilter=this.ctx.createBiquadFilter();
      this.replayFilter.type="lowpass";this.replayFilter.Q.value=.5;this.replayFilter.frequency.value=Math.min(22000,this.ctx.sampleRate*.49);
      this.music.connect(this.replayFilter).connect(this.replayGain).connect(this.musicDuck).connect(this.master);
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
      for(const kind of ["impact","decision"] as const){
        const samples=replayAccentSamples(kind,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);
        buffer.getChannelData(0).set(samples);this.replayAccents.set(kind,buffer);
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
    if(this.ctx.state==="running"&&this.recovery===0)this.restore();
    if(this.ctx.state==="running"&&!this.recovering)return;
    if(!this.recovering)this.silence();
    if(performance.now()-this.lastResume<300)return;
    this.lastResume=performance.now();const context=this.ctx,recovery=this.recovery;
    // 不讓Safari未完成的resume Promise永久阻擋之後的新手勢重試。
    // 中斷後即使Safari回報running也重新排入suspend/resume；兩者都在這次手勢內呼叫。
    if(this.recovery>0&&context.state!=="suspended"&&context.state!=="closed")void context.suspend().catch(()=>{});
    void context.resume().then(()=>{if(this.ctx===context&&this.recovery===recovery)this.restore();}).catch(()=>{});
  }
  toggle() {
    this.muted = !this.muted;
    if (this.muted) this.stopEffects();
    try {
      localStorage.setItem("spinforge-muted", String(this.muted));
    } catch {
      /* 音效偏好寫入失敗不阻止操作。 */
    }
    if (this.master && this.ctx) {
      this.master.gain.cancelAndHoldAtTime(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(
        this.muted || !this.ready ? 0 : 0.65,
        this.ctx.currentTime,
        0.05,
      );
    }
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
      void buffer.catch(()=>{if(this.buffers.get(mode)===buffer)this.buffers.delete(mode);});
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
      if (revision !== this.revision || !this.ready) return;
      const now = this.ctx.currentTime;
      const duration = Math.min(buffer.duration, tracks[mode].duration);
      let offset = this.offsets.get(mode) ?? 0;
      const old = this.playing;
      if (old && ["battle", "clutch"].includes(old.mode) && ["battle", "clutch"].includes(mode))
        offset = (old.offset + now - old.startedAt) % duration;
      this.fadeOut(0.5);
      const source = this.track(this.ctx.createBufferSource());
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
      if(revision!==this.revision)return;
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
    if (!this.ready || !this.ctx || !this.sfx || this.muted) return;
    const osc = this.track(this.ctx.createOscillator()),
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
  event(e: BattleEvent, dashHit=false, cameraPan?:number) {
    if (e.type === "hit") {
      if (!this.ready || !this.ctx || !this.sfx || !this.musicDuck || this.muted) return;
      const now = this.ctx.currentTime;
      // 為衝刺命中保留一聲部，普通擦撞的節流不應吞掉主撞擊聲。
      if (this.impacts.size >= (dashHit?6:5) || (!dashHit && now - this.lastImpact < .035 && e.strength <= this.lastStrength)) return;
      this.lastImpact = now;
      this.lastStrength = e.strength;
      const profile = impactProfile(dashHit ? Math.max(10,e.strength*1.35) : e.strength);
      const source = this.track(this.ctx.createBufferSource()), gain = this.ctx.createGain(), pan = this.ctx.createStereoPanner();
      source.buffer = this.strikes[profile.tier];
      source.playbackRate.value = dashHit ? .8 : 1 + Math.sin(e.time * 17 + e.x) * .04;
      gain.gain.value = profile.gain*(dashHit?1.1:1);
      pan.pan.value = cameraPan ?? Math.max(-.85, Math.min(.85, e.x / 5));
      source.connect(gain).connect(pan).connect(this.sfx);
      this.impacts.set(source,gain);
      source.onended = () => { source.disconnect(); gain.disconnect(); pan.disconnect(); this.impacts.delete(source);this.impactTails.delete(source); };
      // 先完成4ms配樂壓低，再起音，避免強拍遮住撞擊瞬態。
      source.start(now+.008);
      const duck = this.musicDuck.gain;
      duck.cancelAndHoldAtTime(now);
      duck.linearRampToValueAtTime(Math.min(duck.value, dashHit?.18:profile.duck), now + .004);
      duck.setTargetAtTime(1, now + (dashHit?.15:.08), .085);
    }
    if (e.type === "dash") this.playDash(e,cameraPan);
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
  private playDash(e:BattleEvent,cameraPan?:number) {
    if(!this.ready||!this.ctx||!this.sfx||this.muted||(e.player!==0&&e.player!==1))return;
    const now=this.ctx.currentTime;
    if(now-this.lastDash[e.player]<.12)return;
    this.lastDash[e.player]=now;
    const grip=hasRail(e.x,e.z);
    const old=this.dashVoices.get(e.player);
    if(old) { old.gain.gain.cancelAndHoldAtTime(now);old.gain.gain.linearRampToValueAtTime(0,now+.015);old.source.stop(now+.015); }
    const source=this.track(this.ctx.createBufferSource()),gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();
    source.buffer=this.dashBuffers.get(grip)!;gain.gain.value=.95;
    pan.pan.value=cameraPan??Math.max(-.8,Math.min(.8,e.x/5));
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
    this.cuePans.clear();
  }
  private playCue(kind: Cue, initialRate=1, slowReplay=false, cameraPan=0) {
    if (!this.ready || !this.ctx || !this.sfx || this.muted) return;
    this.stopImpacts(initialRate<1?.065:.015);
    this.replayAccent=null;
    this.stopDashes();
    this.stopCues();
    if (!this.cueBuffers.has(kind)) {
      const samples = cueSamples(kind, this.ctx.sampleRate);
      const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
      buffer.getChannelData(0).set(samples);
      this.cueBuffers.set(kind, buffer);
    }
    const source = this.track(this.ctx.createBufferSource()), gain = this.ctx.createGain();
    source.buffer = this.cueBuffers.get(kind)!;
    const now=this.ctx.currentTime;
    source.playbackRate.setValueAtTime(initialRate,now);
    if(!slowReplay)source.playbackRate.linearRampToValueAtTime(1,now+FINISH_RECOVERY);
    const level=slowReplay?1.45:1.2;
    gain.gain.setValueAtTime(initialRate<1?0:level,now);
    if(initialRate<1)gain.gain.linearRampToValueAtTime(level,now+.035);
    let pan:StereoPannerNode|null=null;
    if(slowReplay){pan=this.ctx.createStereoPanner();pan.pan.value=cameraPan;source.connect(gain).connect(pan).connect(this.sfx);this.cuePans.set(source,pan);}
    else source.connect(gain).connect(this.sfx);
    this.cues.set(source, gain);
    source.onended = () => { source.disconnect(); gain.disconnect();pan?.disconnect();this.cuePans.delete(source);this.cues.delete(source); };
    source.start();
    if (this.musicDuck) {
      const duck = this.musicDuck.gain;
      duck.cancelAndHoldAtTime(now);
      duck.linearRampToValueAtTime(Math.min(duck.value,.25), now + .015);
      duck.setTargetAtTime(1, now + (slowReplay?source.buffer.duration/initialRate:initialRate<1?1.45:.65), .12);
    }
  }
  finish(result: Result, initialRate=1, slowReplay=false, cameraPan=0) { this.playCue(result.winner === null ? "draw" : result.finish,initialRate,slowReplay,cameraPan); }
  private restoreDuck(){if(this.ctx&&this.musicDuck){const now=this.ctx.currentTime;this.musicDuck.gain.cancelAndHoldAtTime(now);this.musicDuck.gain.setTargetAtTime(1,now,.04);}}
  stopEffects() {this.stopImpacts();this.stopDashes();this.stopCues();this.replayAccent=null;this.setReplay(null);this.restoreDuck();}
  beginReplay(){this.stopEffects();this.replayPlayed.clear();this.setReplay("tracking");}
  setReplay(stage:ReplayStage|null,cameraPan=0){
    const accent=(stage==="impact"||stage==="decision")?stage:null;
    const fresh=!!accent&&!this.replayPlayed.has(accent);
    if(accent)this.replayPlayed.add(accent);
    if(!this.ctx||!this.replayGain||!this.replayFilter)return;
    const now=this.ctx.currentTime,pan=Math.max(-.8,Math.min(.8,Number.isFinite(cameraPan)?cameraPan:0));
    if(Math.abs(pan-this.replayPan)>.02){
      this.replayPan=pan;
      if(this.replayAccent&&this.impacts.has(this.replayAccent.source))this.replayAccent.pan.pan.setTargetAtTime(pan,now,.045);
      this.cuePans.forEach(p=>p.pan.setTargetAtTime(pan,now,.045));
    }
    if(this.muted)stage=null;
    if(stage===this.replayStage)return;
    this.replayStage=stage;
    const mix=replayMix(stage);
    this.replayGain.gain.cancelAndHoldAtTime(now);this.replayGain.gain.linearRampToValueAtTime(mix.gain,now+mix.seconds);
    this.replayFilter.frequency.cancelAndHoldAtTime(now);this.replayFilter.frequency.exponentialRampToValueAtTime(Math.min(mix.cutoff,this.ctx.sampleRate*.49),now+mix.seconds);
    if(this.replayAccent){const v=this.replayAccent;v.gain.gain.cancelAndHoldAtTime(now);v.gain.gain.linearRampToValueAtTime(0,now+.065);v.source.stop(now+.065);this.replayAccent=null;}
    if(stage===null)this.restoreDuck();
    if(this.ready&&fresh&&accent&&stage===accent&&!this.muted&&this.sfx&&this.impacts.size<6){
      const source=this.track(this.ctx.createBufferSource()),gain=this.ctx.createGain(),stereo=this.ctx.createStereoPanner();
      source.buffer=this.replayAccents.get(accent)!;gain.gain.value=accent==="decision"?1.1:.85;stereo.pan.value=pan;
      source.connect(gain).connect(stereo).connect(this.sfx);this.impacts.set(source,gain);this.replayAccent={source,gain,pan:stereo};
      source.onended=()=>{source.disconnect();gain.disconnect();stereo.disconnect();this.impacts.delete(source);this.impactTails.delete(source);if(this.replayAccent?.source===source)this.replayAccent=null;};
      source.start(now+mix.seconds+.008);
    }
  }
  victory(won: boolean) { this.playCue(won ? "victory" : "defeat"); }
  update(
    battle: Battle | null,
    active: boolean,
    mode: MusicMode | null,
  ) {
    if (!this.ready || !this.ctx) return;
    if(mode===null||mode==="menu") { this.stopDashes();this.stopImpacts();this.replayAccent=null;this.setReplay(null); }
    if (mode !== this.requested && (mode === null || mode === "menu")) this.stopCues();
    if (mode !== this.requested)
      this.music?.gain.setTargetAtTime(musicLevel(this.volume, mode), this.ctx.currentTime, .06);
    this.rotors.forEach((r, i) => {
      const held=this.replayStage==="impact"||this.replayStage==="decision";
      r.osc.frequency.setTargetAtTime(
        (45 + (battle?.tops[i].rpm ?? 0) * 135 + (active && battle && battle.tops[i].dashUntil>battle.time ? 120 : 0))*(this.replayStage?(held?.65:.82):1),
        this.ctx!.currentTime,
        0.08,
      );
      r.gain.gain.setTargetAtTime(
        active ? (battle?.tops[i].rpm ?? 0) * 0.08*(this.replayStage?(held?.2:.65):1) : 0,
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
