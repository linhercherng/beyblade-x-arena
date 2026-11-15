import{finishSamples,FINISH_VOICE_CUES,type FinishVoiceCue}from'./finish-voice.ts';
import{beyEffects,hitBey,type BeyEffects}from'./bey-effects.ts';
import type{CountdownPlayback}from'./launch-countdown.ts';
import {countdownSamples,openingSamples,COUNTDOWN_RATE,type CountdownCue} from './countdown-voice.ts';
import {audioStatus} from "./audio-state.ts";
import type { Battle, BattleEvent, Result } from "./physics.ts";
import { cueSamples, FINISH_RECOVERY, type Cue } from "./finish.ts";
import tracks from "./music-tracks.json" with {type:"json"};
import { musicVolume, type MusicMode } from "./music-state.ts";
import { impactProfile, impactSamples, musicLevel, contactFeedback } from "./impact.ts";
import { dashSamples, hasRail } from "./dash.ts";
import { replayMix, replayAccentSamples, type ReplayStage } from "./replay-audio.ts";
import{frictionSamples,type FrictionFrame,type FrictionMaterial}from'./friction.ts';
import{HIGHLIGHT_RATE}from'./highlight.ts';

type Playing = {
  mode: MusicMode;
  source: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  offset: number;
  duration: number;
};
type FrictionVoice={source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;pan:StereoPannerNode;closing:boolean;material:FrictionMaterial};

export class Sound {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  rotors: { osc: OscillatorNode; gain: GainNode }[] = [];
  muted = false;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  musicDuck: GainNode | null = null;
  private musicDuckUntil=-Infinity;
  private musicDuckLevel=1;
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
  private countdownBuffers=new Map<CountdownCue,AudioBuffer>();
  private voicePlayback:(CountdownPlayback&{source:AudioBufferSourceNode;gain:GainNode;accent:{source:AudioBufferSourceNode;gain:GainNode}|null})|null=null;
  private announcementBuffers=new Map<FinishVoiceCue,AudioBuffer>();
  private launchBuffers=new Map<CountdownCue,AudioBuffer>();
  private voiceMusicDuck:GainNode|null=null;
  private voiceSfxDuck:GainNode|null=null;
  private voiceDuckUntil=-Infinity;
  private voiceTails=new Map<AudioBufferSourceNode,GainNode>();
  private voiceReadyAt=0;
  get countdownReady(){return this.muted||typeof AudioContext==='undefined'||this.ready&&!!this.ctx&&this.ctx.currentTime>=this.voiceReadyAt;}
  private cueBuffers = new Map<string, AudioBuffer>();
  private cues = new Map<AudioBufferSourceNode, GainNode>();
  private cueTails = new Map<AudioBufferSourceNode,GainNode>();
  private dashBuffers = new Map<boolean,AudioBuffer>();
  private dashVoices = new Map<number,{source:AudioBufferSourceNode;gain:GainNode}>();
  private lastDash = [-Infinity,-Infinity];
  private frictionBuffers=new Map<FrictionMaterial,AudioBuffer>();
  private frictionVoices=new Map<number,FrictionVoice>();
  private frictionMix=1;
  private frictionDuck:GainNode|null=null;
  private frictionDuckUntil=-Infinity;
  private frictionDuckLevel=1;
  private resumeRejected=false;
  get status(){return audioStatus({available:typeof AudioContext!=="undefined",muted:this.muted,context:this.ctx?.state??null,sessionInterrupted:this.session?.state==="interrupted",background:this.background,recovering:this.recovering,resumeAge:this.lastResume===-Infinity?null:performance.now()-this.lastResume,rejected:this.resumeRejected,musicFailed:!!this.requested&&this.volume>0&&this.failed.has(this.requested)});}
  private events:{atMs:number;kind:string}[]=[];
  private note(kind:string){this.events.push({atMs:Math.round(performance.now()),kind});if(this.events.length>60)this.events.shift();}
  diagnostics(){return {status:this.status,state:this.ctx?.state??(typeof AudioContext==="undefined"?"unavailable":"not-started"),ready:this.ready,session:this.session?.state??null,
    muted:this.muted,musicVolume:this.volume,contextTime:this.ctx?.currentTime??null,sampleRate:this.ctx?.sampleRate??null,sources:this.sources.size,
    music:this.playing?.mode??null,buffers:this.buffers.size,rotors:this.rotors.length,friction:this.frictionVoices.size,events:this.events.map(e=>({...e}))};}
  onInterruption:(()=>void)|null=null;
  private session:(EventTarget&{readonly state?:string})|undefined;
  private clockTime=-1;
  private clockWall=0;
  private clockSampleWall=0;
  private clockGapGrace=false;
  private background=false;
  private recovering=true;
  private recovery=0;
  private lastResume=-Infinity;
  private sources=new Set<AudioScheduledSourceNode>();
  private get ready(){return !!this.ctx&&this.ctx.state==="running"&&!this.background&&!this.recovering&&this.session?.state!=="interrupted";}
  private track<T extends AudioScheduledSourceNode>(source:T):T{
    this.sources.add(source);source.addEventListener("ended",()=>this.sources.delete(source),{once:true});return source;
  }
  private interrupt(reason="context-interrupted"){
    this.note(reason);
    if(!this.ctx)return;
    const notify=!this.recovering&&!this.muted;
    this.silence();
    if(notify)this.onInterruption?.();
  }
  recoverAudio(){
    if(this.session?.state==="interrupted"||this.ctx?.state==="closed"||(this.recovering&&!this.resumeRejected&&performance.now()-this.lastResume<1500))return;
    this.note("manual-recovery");this.failed.clear();this.silence();this.unlock();
  }
  private silence(){
    if(!this.ctx||!this.master)return;
    this.recovering=true;this.resumeRejected=false;this.recovery++;this.lastResume=-Infinity;
    const now=this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(0,now);
    this.revision++;this.pending=null;this.fadeOut(0);this.stopEffects();
    // 包含交叉淡出中的配樂與短音效，避免凍結的聲源在恢復時一起響起。
    for(const source of this.sources){source.stop(now);source.disconnect();}this.sources.clear();
    for(const v of this.frictionVoices.values()){v.filter.disconnect();v.gain.disconnect();v.pan.disconnect();}this.frictionVoices.clear();
    for(const gain of this.cueTails.values())gain.disconnect();this.cueTails.clear();
    for(const gain of this.voiceTails.values())gain.disconnect();this.voiceTails.clear();
    for(const rotor of this.rotors){rotor.gain.gain.cancelScheduledValues(now);rotor.gain.gain.setValueAtTime(0,now);}
    this.lastImpact=-Infinity;this.lastDash=[-Infinity,-Infinity];
  }
  private restore(){
    if(!this.ctx||!this.master||this.background||this.ctx.state!=="running"||!this.recovering||this.session?.state==="interrupted")return;
    this.resumeRejected=false;this.note("restored");
    this.recovering=false;this.clockGapGrace=false;this.clockTime=this.ctx.currentTime;this.clockWall=this.clockSampleWall=performance.now();
    const now=this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(0,now);
    this.master.gain.linearRampToValueAtTime(this.muted?0:.65,now+.25);
    this.voiceReadyAt=now+.25;
  }
  setBackground(hidden:boolean){
    if(hidden===this.background)return;
    this.background=hidden;this.note(hidden?"background":"foreground");
    if(hidden){this.silence();if(this.ctx&&this.ctx.state!=="suspended"&&this.ctx.state!=="closed")void this.ctx.suspend().catch(()=>{});}
    // 回到前景保留靜音，下一次操作在使用者手勢內恢復。
  }
  constructor() {
    if(typeof navigator!=="undefined"){
      this.session=(navigator as Navigator&{audioSession?:EventTarget&{readonly state?:string}}).audioSession;
      this.session?.addEventListener?.("statechange",()=>{if(this.session?.state==="interrupted")this.interrupt("session-interrupted");});
      navigator.mediaDevices?.addEventListener("devicechange",()=>this.interrupt("device-change"));
    }
    try {
      this.muted = localStorage.getItem("spinforge-muted") === "true";
      const saved = localStorage.getItem("spinforge-music-volume");
      if (saved !== null) this.volume = musicVolume(Number(saved));
    } catch {
      /* 儲存禁用時仍可遊玩，音效設定只保留本次。 */
    }
  }
  unlock() {
    if(this.background||this.session?.state==="interrupted"||typeof AudioContext==="undefined")return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.ctx.addEventListener("statechange",()=>{
        this.note("state-"+this.ctx?.state);
        if(this.ctx?.state!=="running"){if(!this.recovering)this.interrupt();}
        else if(this.lastResume!==-Infinity)this.restore();
      });
      this.ctx.addEventListener("sinkchange",()=>this.interrupt("sink-change"));
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.15;
      this.master.connect(limiter).connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.27;
      this.frictionDuck=this.ctx.createGain();this.frictionDuck.connect(this.sfx);
      this.voiceSfxDuck=this.ctx.createGain();this.sfx.connect(this.voiceSfxDuck).connect(this.master);
      this.music = this.ctx.createGain();
      this.music.gain.value = musicLevel(this.volume, this.requested);
      this.musicDuck = this.ctx.createGain();
      this.replayGain=this.ctx.createGain();this.replayFilter=this.ctx.createBiquadFilter();
      this.replayFilter.type="lowpass";this.replayFilter.Q.value=.5;this.replayFilter.frequency.value=Math.min(22000,this.ctx.sampleRate*.49);
      this.voiceMusicDuck=this.ctx.createGain();
      this.music.connect(this.replayFilter).connect(this.replayGain).connect(this.musicDuck).connect(this.voiceMusicDuck).connect(this.master);
      for(const cue of [3,2,1,0]as const){
        const samples=countdownSamples(cue),buffer=this.ctx.createBuffer(1,samples.length,COUNTDOWN_RATE);buffer.getChannelData(0).set(samples);this.countdownBuffers.set(cue,buffer);
      }
      for(const cue of FINISH_VOICE_CUES){const samples=finishSamples(cue),buffer=this.ctx.createBuffer(1,samples.length,COUNTDOWN_RATE);buffer.getChannelData(0).set(samples);this.announcementBuffers.set(cue,buffer);}
      for(const cue of [3,2,1,0]as const){const samples=openingSamples(cue,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);buffer.getChannelData(0).set(samples);this.launchBuffers.set(cue,buffer);}
      this.strikes = ([0, 1, 2] as const).map(tier => {
        const samples = impactSamples(tier, this.ctx!.sampleRate);
        const buffer = this.ctx!.createBuffer(1, samples.length, this.ctx!.sampleRate);
        buffer.getChannelData(0).set(samples);
        return buffer;
      });
      for(const material of ['metal','plastic','rubber']as const){const friction=frictionSamples(this.ctx.sampleRate,material),buffer=this.ctx.createBuffer(1,friction.length,this.ctx.sampleRate);buffer.getChannelData(0).set(friction);this.frictionBuffers.set(material,buffer);}
      // 在使用者啟用音訊時預熱，避免第一次衝刺在交戰迴圈內合成波形。
      for(const grip of [false,true]) {
        const samples=dashSamples(this.ctx.sampleRate,grip);
        const buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);
        buffer.getChannelData(0).set(samples);this.dashBuffers.set(grip,buffer);
      }
      for(const kind of ["burst","over","extreme","spin","draw"] as const) {
        const samples=cueSamples(kind,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);
        buffer.getChannelData(0).set(samples);this.cueBuffers.set(kind,buffer);
        if(kind!=='draw')for(const material of ['metal','plastic','rubber']as const){const samples=cueSamples(kind,this.ctx.sampleRate,material),variant=this.ctx.createBuffer(1,samples.length,this.ctx.sampleRate);variant.getChannelData(0).set(samples);this.cueBuffers.set(`${kind}:${material}`,variant);}
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
    this.resumeRejected=false;this.note("resume-attempt");
    this.lastResume=performance.now();const context=this.ctx,recovery=this.recovery;
    // 不讓Safari未完成的resume Promise永久阻擋之後的新手勢重試。
    // 中斷後即使Safari回報running也重新排入suspend/resume；兩者都在這次手勢內呼叫。
    if(this.recovery>0&&context.state!=="suspended"&&context.state!=="closed")void context.suspend().catch(()=>{});
    void context.resume().then(()=>{if(this.ctx===context&&this.recovery===recovery)this.restore();}).catch(()=>{if(this.ctx===context&&this.recovery===recovery)this.resumeRejected=true;this.note("resume-rejected");});
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
      this.music.gain.setTargetAtTime(musicLevel(this.volume, this.requested)*this.frictionMix, this.ctx.currentTime, 0.04);
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
  event(e: BattleEvent, dashHit=false, cameraPan?:number, battle?:Battle) {
    if (e.type === "hit") {
      if (!this.ready || !this.ctx || !this.sfx || !this.musicDuck || this.muted) return;
      const now = this.ctx.currentTime;
      // 為衝刺命中保留一聲部，普通擦撞的節流不應吞掉主撞擊聲。
      const speed=this.replayStage?HIGHLIGHT_RATE:1;
      if (this.impacts.size >= (dashHit?6:5) || (!dashHit && now - this.lastImpact < .035 && e.strength <= this.lastStrength)) return;
      this.lastImpact = now;
      this.lastStrength = e.strength;
      const profile = impactProfile(dashHit ? Math.max(10,e.strength*1.35) : e.strength);
      const contact=contactFeedback(e,battle);
      if(contact)profile.gain*=contact.weight;
      const source = this.track(this.ctx.createBufferSource()), gain = this.ctx.createGain(), pan = this.ctx.createStereoPanner();
      source.buffer = this.strikes[profile.tier];
      const fx=battle?beyEffects(hitBey(battle)):null;
      source.playbackRate.value = (dashHit ? .8 : 1 + Math.sin(e.time * 17 + e.x) * .04)*(fx?.pitch??1)*(battle&&battle.tops[0].bey.spin!==battle.tops[1].bey.spin?.93:1);
      gain.gain.value = profile.gain*(dashHit?1.1:1);
      if(contact)source.playbackRate.value*=.88+.12*contact.headOn;
      source.playbackRate.value*=speed;
      pan.pan.value = cameraPan ?? Math.max(-.85, Math.min(.85, e.x / 5));
      const filter=fx||contact&&contact.headOn<.9?this.ctx.createBiquadFilter():null;
      if(filter){filter.type='lowpass';filter.frequency.value=Math.min(fx?.dash.cutoff??4000,contact?1600+2400*contact.headOn:4000)*speed;filter.Q.value=.6+Math.abs(contact?.shear??0)*.2;source.connect(filter).connect(gain);}else source.connect(gain);
      gain.connect(pan).connect(this.sfx);
      this.impacts.set(source,gain);
      source.onended = () => { source.disconnect();filter?.disconnect(); gain.disconnect(); pan.disconnect(); this.impacts.delete(source);this.impactTails.delete(source); };
      // 先完成4ms配樂壓低，再起音，避免強拍遮住撞擊瞬態。
      this.duckFriction(dashHit?.28:.55,dashHit?.16:.08);
      source.start(now+.008);
      this.duckMusic(dashHit?.18:profile.duck,(dashHit?.15:.08)/speed,.085/speed);
    }
    if (e.type === "dash") this.playDash(e,cameraPan,battle);
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
  private playDash(e:BattleEvent,cameraPan?:number,battle?:Battle) {
    if(!this.ready||!this.ctx||!this.sfx||this.muted||(e.player!==0&&e.player!==1))return;
    const now=this.ctx.currentTime;
    if(now-this.lastDash[e.player]<.12)return;
    this.lastDash[e.player]=now;
    const grip=hasRail(e.x,e.z);
    const old=this.dashVoices.get(e.player);
    if(old) { old.gain.gain.cancelAndHoldAtTime(now);old.gain.gain.linearRampToValueAtTime(0,now+.015);old.source.stop(now+.015); }
    const source=this.track(this.ctx.createBufferSource()),gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();
    source.buffer=this.dashBuffers.get(grip)!;gain.gain.value=.95;
    const speed=this.replayStage?HIGHLIGHT_RATE:1,fx=battle?beyEffects(battle.tops[e.player].bey):null,filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=(fx?.dash.cutoff??3800)*speed;
    source.playbackRate.value=(fx?.dash.rate??1)*speed;
    if(fx?.dash.pulse)for(let i=0;i<6;i++){const at=now+.008+i*.05/speed;gain.gain.linearRampToValueAtTime(.95*(1-fx.dash.pulse),at+.02/speed);gain.gain.linearRampToValueAtTime(.95,at+.045/speed);}
    pan.pan.value=cameraPan??Math.max(-.8,Math.min(.8,e.x/5));
    source.connect(filter).connect(gain).connect(pan).connect(this.sfx);
    this.dashVoices.set(e.player,{source,gain});
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();if(this.dashVoices.get(e.player)?.source===source)this.dashVoices.delete(e.player);};
    this.duckFriction(grip?.6:.45,.22);
    source.start(now+.008);
    this.duckMusic(.18,.22/speed,.12/speed);
  }
  private stopCues() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for(const [source,gain]of this.cueTails){source.stop(now);source.disconnect();gain.disconnect();this.sources.delete(source);}this.cueTails.clear();
    this.cues.forEach((gain, source) => {
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.linearRampToValueAtTime(0, now + .015);
      source.stop(now + .015);
      this.cueTails.set(source,gain);
    });
    this.cues.clear();
    this.cuePans.clear();
  }
  private playCue(kind: Cue, initialRate=1, slowReplay=false, cameraPan=0,identity?:BeyEffects) {
    if (!this.ready || !this.ctx || !this.sfx || this.muted) return;
    this.stopImpacts(initialRate<1?.065:.015);
    this.replayAccent=null;
    this.stopDashes();
    this.stopCues();
    const material=identity?(identity.rubber?'rubber':identity.metal?'metal':'plastic'):undefined,key=material&&['burst','over','extreme','spin'].includes(kind)?`${kind}:${material}`:kind;
    if (!this.cueBuffers.has(key)) {
      const samples = cueSamples(kind, this.ctx.sampleRate,material);
      const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
      buffer.getChannelData(0).set(samples);
      this.cueBuffers.set(key, buffer);
    }
    const source = this.track(this.ctx.createBufferSource()), gain = this.ctx.createGain();
    source.buffer = this.cueBuffers.get(key)!;
    const now=this.ctx.currentTime;
    source.playbackRate.setValueAtTime(initialRate,now);
    if(!slowReplay)source.playbackRate.linearRampToValueAtTime(1,now+FINISH_RECOVERY);
    const level=slowReplay?1.45:1.2;
    gain.gain.setValueAtTime(initialRate<1?0:level,now);
    if(initialRate<1)gain.gain.linearRampToValueAtTime(level,now+.035);
    let pan:StereoPannerNode|null=null;const filter=identity?this.ctx.createBiquadFilter():null;
    if(filter){filter.type='lowpass';filter.frequency.setValueAtTime(identity!.dash.cutoff*initialRate,now);if(!slowReplay)filter.frequency.linearRampToValueAtTime(identity!.dash.cutoff,now+FINISH_RECOVERY);filter.Q.value=identity!.bound?1.1:.6;source.connect(filter).connect(gain);}else source.connect(gain);
    if(slowReplay){pan=this.ctx.createStereoPanner();pan.pan.value=cameraPan;gain.connect(pan).connect(this.sfx);this.cuePans.set(source,pan);}
    else gain.connect(this.sfx);
    this.cues.set(source, gain);
    source.onended = () => { source.disconnect();filter?.disconnect(); gain.disconnect();pan?.disconnect();this.cuePans.delete(source);this.cues.delete(source);this.cueTails.delete(source); };
    if(['burst','over','extreme','spin'].includes(kind))this.duckFriction(.4,.18);
    source.start(now+.008);
    const duration=slowReplay?source.buffer.duration/initialRate:source.buffer.duration+(1-initialRate)*FINISH_RECOVERY/2;
    this.duckMusic(slowReplay?.12:.25,.008+duration);
  }
  finish(result: Result, initialRate=1, slowReplay=false, cameraPan=0,battle?:Battle) {
    const kind=result.winner===null?'draw':result.finish;
    this.playCue(kind,initialRate,slowReplay,cameraPan,battle&&result.winner!==null?beyEffects(battle.tops[1-result.winner].bey):undefined);
    if(!slowReplay)this.speakVoice(this.announcementBuffers.get(kind));
  }
  private duckMusic(level:number,hold:number,release=.12){
    if(!this.ctx||!this.musicDuck)return;
    const now=this.ctx.currentTime,p=this.musicDuck.gain;
    if(now>=this.musicDuckUntil)this.musicDuckLevel=1;
    this.musicDuckLevel=Math.min(this.musicDuckLevel,level,p.value);this.musicDuckUntil=Math.max(this.musicDuckUntil,now+hold);
    // 後來的擦撞不能縮短終結或慢放材質尾音的退讓。
    p.cancelAndHoldAtTime(now);p.linearRampToValueAtTime(this.musicDuckLevel,now+.004);p.setValueAtTime(this.musicDuckLevel,this.musicDuckUntil);p.setTargetAtTime(1,this.musicDuckUntil,release);
  }
  private restoreDuck(){this.musicDuckUntil=-Infinity;this.musicDuckLevel=1;if(this.ctx&&this.musicDuck){const now=this.ctx.currentTime;this.musicDuck.gain.cancelAndHoldAtTime(now);this.musicDuck.gain.setTargetAtTime(1,now,.04);}}
  stopEffects() {this.stopVoice();this.stopImpacts();this.stopDashes();this.stopCues();this.stopFriction();this.clearFrictionDuck();this.replayAccent=null;this.setReplay(null);this.restoreDuck();}
  private duckFriction(level:number,hold:number){
    if(!this.ctx||!this.frictionDuck)return;
    const now=this.ctx.currentTime,speed=this.replayStage?HIGHLIGHT_RATE:1,p=this.frictionDuck.gain;
    if(now>=this.frictionDuckUntil)this.frictionDuckLevel=1;
    // 重疊事件保留較深的退讓與較晚的恢復，避免弱擦撞提早掀起底音。
    this.frictionDuckLevel=Math.min(this.frictionDuckLevel,level,p.value);this.frictionDuckUntil=Math.max(this.frictionDuckUntil,now+hold/speed);
    p.cancelAndHoldAtTime(now);p.linearRampToValueAtTime(this.frictionDuckLevel,now+.004);p.setValueAtTime(this.frictionDuckLevel,this.frictionDuckUntil);p.setTargetAtTime(1,this.frictionDuckUntil,.12/speed);
  }
  private clearFrictionDuck(){
    if(!this.ctx||!this.frictionDuck||this.frictionDuckUntil===-Infinity)return;
    this.frictionDuckUntil=-Infinity;this.frictionDuckLevel=1;const now=this.ctx.currentTime,p=this.frictionDuck.gain;p.cancelAndHoldAtTime(now);p.setTargetAtTime(1,now,.04);
  }
  private stopFriction(){
    if(!this.ctx)return;const now=this.ctx.currentTime;
    for(const v of this.frictionVoices.values())if(!v.closing){v.closing=true;v.gain.gain.cancelAndHoldAtTime(now);v.gain.gain.linearRampToValueAtTime(0,now+.025);v.source.stop(now+.025);}
  }
  private updateFriction(frames:readonly FrictionFrame[]|null,active:boolean,enabled:boolean){
    if(!this.ctx||!this.frictionDuck||!this.frictionBuffers.size)return 0;const now=this.ctx.currentTime;let level=0;
    for(let i=0;i<2;i++){
      const f=frames?.[i],playing=enabled&&!!f&&(f.phase==='settle'||active&&f.phase==='spin');let v=this.frictionVoices.get(i);
      const material=f?.material==='metal'||f?.material==='rubber'?f.material:'plastic';
      if(!playing||v&&v.material!==material){if(v&&!v.closing){v.closing=true;v.gain.gain.cancelAndHoldAtTime(now);v.gain.gain.linearRampToValueAtTime(0,now+.025);v.source.stop(now+.025);}continue;}
      if(v?.closing)continue;
      if(!v){
        const source=this.track(this.ctx.createBufferSource()),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter(),pan=this.ctx.createStereoPanner();source.buffer=this.frictionBuffers.get(material)!;source.loop=true;filter.type='lowpass';filter.Q.value=material==='metal'?1.1:material==='rubber'?.8:.55;gain.gain.value=0;source.connect(filter).connect(gain).connect(pan).connect(this.frictionDuck);v={source,gain,filter,pan,closing:false,material};this.frictionVoices.set(i,v);
        const voice=v;source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();if(this.frictionVoices.get(i)===voice)this.frictionVoices.delete(i);};source.start(now,now%source.buffer.duration);
      }
      const target=Number.isFinite(f!.level)?Math.max(0,Math.min(.25,f!.level)):0;level=Math.max(level,target);
      v.gain.gain.cancelAndHoldAtTime(now);v.gain.gain.linearRampToValueAtTime(target,now+.025);
      const speed=this.replayStage?HIGHLIGHT_RATE:1;
      v.source.playbackRate.setTargetAtTime((Number.isFinite(f!.rate)?Math.max(.5,Math.min(1.25,f!.rate)):1)*speed,now,.035);
      v.filter.frequency.setTargetAtTime((Number.isFinite(f!.cutoff)?Math.max(500,Math.min(4000,f!.cutoff)):1500)*speed,now,.035);
      v.pan.pan.setTargetAtTime(Number.isFinite(f!.pan)?Math.max(-.8,Math.min(.8,f!.pan)):0,now,.04);
    }
    return level;
  }
  private stopVoice(){
    if(!this.ctx)return;const now=this.ctx.currentTime,voice=this.voicePlayback;
    for(const [source,gain]of this.voiceTails){source.stop(now);source.disconnect();gain.disconnect();this.sources.delete(source);}this.voiceTails.clear();
    if(!voice&&now>this.voiceDuckUntil)return;
    if(voice&&!voice.complete)voice.cancelled=true;
    this.voicePlayback=null;this.voiceDuckUntil=-Infinity;
    if(voice)for(const playing of [voice,voice.accent])if(playing){playing.gain.gain.cancelAndHoldAtTime(now);playing.gain.gain.linearRampToValueAtTime(0,now+.015);playing.source.stop(now+.015);this.voiceTails.set(playing.source,playing.gain);}
    // Hold through the existing 180ms music fade so cancellation cannot cause a swell.
    for(const [node,release]of [[this.voiceMusicDuck,.06],[this.voiceSfxDuck,.18]]as const)if(node){const p=node.gain;p.cancelAndHoldAtTime(now);p.setValueAtTime(p.value,now+.18);p.setTargetAtTime(1,now+.18,release);}
  }
  countdown(cue:CountdownCue,landed=false){
    if(this.muted||typeof AudioContext==='undefined')return{complete:true,cancelled:false};
    return this.speakVoice(this.countdownBuffers.get(cue),{buffer:this.launchBuffers.get(cue===1&&landed?3:cue),rate:cue===1||cue===0?1:1+(3-cue)*.12,gain:cue===0?1.1:.65});
  }
  private speakVoice(buffer:AudioBuffer|undefined,accent?:{buffer:AudioBuffer|undefined;rate:number;gain:number}){
    this.stopVoice();
    if(!this.ready||!this.ctx||!this.master||!this.sfx||this.muted||!buffer)return null;
    const source=this.track(this.ctx.createBufferSource()),gain=this.ctx.createGain();
    source.buffer=buffer;gain.gain.value=.52;source.connect(gain).connect(this.master);
    let accentVoice:{source:AudioBufferSourceNode;gain:GainNode}|null=null;
    if(accent?.buffer){const a=this.track(this.ctx.createBufferSource()),g=this.ctx.createGain();a.buffer=accent.buffer;a.playbackRate.value=accent.rate;g.gain.value=accent.gain;a.connect(g).connect(this.sfx);a.onended=()=>{a.disconnect();g.disconnect();this.voiceTails.delete(a);if(playback.complete&&this.voicePlayback===playback)this.voicePlayback=null;};accentVoice={source:a,gain:g};}
    const context=this.ctx,startAt=context.currentTime+.012;
    const playback={source,gain,accent:accentVoice,complete:false,cancelled:false,elapsed:()=>context.currentTime-startAt};this.voicePlayback=playback;
    source.onended=()=>{playback.complete=true;source.disconnect();gain.disconnect();this.voiceTails.delete(source);if(this.voicePlayback?.source===source&&(!accentVoice||accentVoice.source.buffer!.duration/accentVoice.source.playbackRate.value<=buffer.duration))this.voicePlayback=null;};
    const now=this.ctx.currentTime;
    // Independent priority gains keep hit/replay duck recovery from masking speech.
    this.voiceDuckUntil=startAt+buffer.duration+.06+1.08;
    for(const [node,level,release]of [[this.voiceMusicDuck,.1,.12],[this.voiceSfxDuck,.32,.18]]as const)if(node){const p=node.gain;p.cancelAndHoldAtTime(now);p.linearRampToValueAtTime(level,now+.008);p.setValueAtTime(level,startAt+buffer.duration+.06);p.setTargetAtTime(1,startAt+buffer.duration+.06,release);}
    accentVoice?.source.start(startAt);source.start(startAt);
    return playback;
  }
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
  victory(won:boolean,localWinner:0|1|null=null){
    this.playCue(localWinner!==null||won?'victory':'defeat');
    const kind=localWinner===null?(won?'victory':'defeat'):localWinner===0?'player1':'player2';
    this.speakVoice(this.announcementBuffers.get(kind));
  }
  update(
    battle: Battle | null,
    active: boolean,
    mode: MusicMode | null,
    waitingForCountdown=false,
    friction:readonly FrictionFrame[]|null=null,
  ) {
    if (!this.ready || !this.ctx) return;
    const wall=performance.now(),clock=this.ctx.currentTime;
    const sampleGap=wall-this.clockSampleWall;this.clockSampleWall=wall;
    if(clock!==this.clockTime){this.clockTime=clock;this.clockWall=wall;this.clockGapGrace=false;}
    // 同一時鐘只寬限一次取樣空窗，避免開場誤判，也不讓低幀率掩蓋真停滯。
    else if(sampleGap>=1000&&!this.clockGapGrace){this.clockWall=wall;this.clockGapGrace=true;}
    // 路由切換可能沒有事件且仍回報running；只在預期有聲音時檢查停住的時鐘。
    else if(!this.muted&&(this.sources.size>0||active||waitingForCountdown)&&wall-this.clockWall>1000){this.interrupt("clock-stalled");return;}
    const frictionLevel=this.updateFriction(friction,active,!this.muted&&(active||mode==='results')&&mode!==null&&mode!=='menu'&&this.replayStage!=='impact'&&this.replayStage!=='decision'),mix=1/(1+20*frictionLevel);
    if(!active&&mode===null&&this.requested===null&&!this.pending&&!this.sources.size)return;
    if(mode===null||mode==="menu") { this.stopVoice();this.stopDashes();this.stopImpacts();this.clearFrictionDuck();this.replayAccent=null;this.setReplay(null); }
    if (mode !== this.requested && (mode === null || mode === "menu")) this.stopCues();
    if(mode!==this.requested||Math.abs(mix-this.frictionMix)>.01||mix===1&&this.frictionMix!==1){
      const seconds=mix<this.frictionMix ? .08 : .18;this.frictionMix=mix;
      this.music?.gain.cancelAndHoldAtTime(this.ctx.currentTime);this.music?.gain.setTargetAtTime(musicLevel(this.volume,mode)*mix,this.ctx.currentTime,seconds);
    }
    this.rotors.forEach((r, i) => {
      const top=battle?.tops[i],fx=top?beyEffects(top.bey):null;
      const wave=fx?.type==="stamina"?"sine":fx?.type==="defense"||fx?.type==="balance"?"triangle":"sawtooth";
      if(r.osc.type!==wave)r.osc.type=wave;
      const held=this.replayStage==="impact"||this.replayStage==="decision";
      r.osc.frequency.setTargetAtTime(
        (45 + (battle?.tops[i].rpm ?? 0) * 135 + (active && battle && battle.tops[i].dashUntil>battle.time ? 120 : 0))*(this.replayStage?(held?.65:.82):1)*(fx?.pitch??1)*(battle&&battle.tops[0].bey.spin!==battle.tops[1].bey.spin?(fx?.spin===1?1.04:.96):1),
        this.ctx!.currentTime,
        0.08,
      );
      r.gain.gain.setTargetAtTime(
        active ? (battle?.tops[i].rpm ?? 0) * (fx?.free?.06:.08)*(this.replayStage?(held?.2:.65):1) : 0,
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
