import { MUSIC, MusicKey } from "./musicAssets";
export type MusicPreferences = { enabled: boolean; volume: number };
export type MusicStatus =
  "idle" | "loading" | "playing" | "paused" | "muted" | "blocked" | "error";
type Voice = { source: AudioBufferSourceNode; gain: GainNode; key: MusicKey };
type Dependencies = {
  context?: () => AudioContext;
  load?: (
    key: MusicKey,
    context: AudioContext,
    signal: AbortSignal,
  ) => Promise<AudioBuffer>;
  status?: (status: MusicStatus) => void;
};
export const DEFAULT_MUSIC: MusicPreferences = { enabled: true, volume: 0.35 };
const KEY = "spheres.music.v1";
export function loadMusicPreferences(
  storage: { getItem(key: string): string | null } | null,
): MusicPreferences {
  try {
    const v = JSON.parse(storage?.getItem(KEY) ?? "null");
    if (
      v &&
      typeof v.enabled === "boolean" &&
      typeof v.volume === "number" &&
      Number.isFinite(v.volume) &&
      v.volume >= 0 &&
      v.volume <= 1
    )
      return { enabled: v.enabled, volume: v.volume };
  } catch {
    /* Storage is optional, including file:// browsers. */
  }
  return { ...DEFAULT_MUSIC };
}
export function saveMusicPreferences(
  storage: { setItem(key: string, value: string): void } | null,
  prefs: MusicPreferences,
) {
  try {
    storage?.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* Keep in-memory settings. */
  }
}
export function musicForScreen(
  selection: boolean,
  preview: "atlas" | "meridian" | "concordat" | null,
  player: "atlas" | "meridian" | "concordat",
  result: "win" | "loss" | null,
  busy: boolean,
  initialMenu = true,
): MusicKey {
  if (selection && (preview || initialMenu)) return preview ?? "menu";
  if (!busy && result) return result === "win" ? `victory-${player}` : "loss";
  return player;
}
// One context owns all music. React renders never create playback instances.
// Different themes fade out before the next starts; wrap fades are baked into each file.
export class MusicPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private active: Voice | null = null;
  private desired: MusicKey | null = null;
  private preferences = { ...DEFAULT_MUSIC };
  private unlocked = false;
  private hidden = false;
  private held = false;
  private duck = 1;
  private pauseSync:Promise<void>=Promise.resolve();
  private generation = 0;
  private disposed = false;
  private loading = false;
  private buffers = new Map<MusicKey, AudioBuffer>();
  private pending = new Map<MusicKey, Promise<AudioBuffer>>();
  private requests = new Map<MusicKey,AbortController>();
  private decoding:Promise<void>=Promise.resolve();
  constructor(private deps: Dependencies = {}) {}
  private report(status: MusicStatus) {
    if (!this.disposed) this.deps.status?.(status);
  }
  private ensureContext() {
    if (this.disposed) throw Error("disposed");
    if(this.context?.state==='closed'){for(const voice of this.voices){voice.source.disconnect();voice.gain.disconnect();}this.voices.clear();this.active=null;this.context=null;this.master=null;}
    if (!this.context) {
      this.context = this.deps.context?.() ?? new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
      const context=this.context;context.onstatechange=()=>{if(context===this.context&&!this.disposed&&this.unlocked&&!this.hidden&&!this.held&&context.state!=='running'&&context.state!=='closed')void this.syncPause();};
    }
    return this.context;
  }
  private level() {
    return this.preferences.enabled ? this.preferences.volume * this.duck : 0;
  }
  private ramp(parameter: AudioParam, value: number, seconds: number) {
    const now = this.context!.currentTime;
    if (typeof parameter.cancelAndHoldAtTime === "function")
      parameter.cancelAndHoldAtTime(now);
    else {
      const previous = parameter.value;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(previous, now);
    }
    parameter.linearRampToValueAtTime(value, now + seconds);
  }
  setPreferences(value: MusicPreferences) {
    this.preferences = {
      enabled: !!value.enabled,
      volume: Number.isFinite(value.volume)
        ? Math.max(0, Math.min(1, value.volume))
        : DEFAULT_MUSIC.volume,
    };
    if (this.master) this.ramp(this.master.gain, this.level(), 0.2);
    if (!this.level()) this.report("muted");
    else if (this.active)
      this.report(this.hidden || this.held ? "paused" : "playing");
    if (this.unlocked) void this.pump();
  }
  setDucked(value: boolean) {
    this.duck = value ? 0.25 : 1;
    if (this.master) this.ramp(this.master.gain, this.level(), 0.12);
    if (!value && this.unlocked) void this.pump();
  }
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    void this.syncPause();
  }
  setHeld(held: boolean) {
    this.held = held;
    void this.syncPause();
  }
  private syncPause():Promise<void>{
    // Browser suspend/resume promises can settle late. Serialize them and read the latest intent.
    this.pauseSync=this.pauseSync.catch(()=>undefined).then(async()=>{
      if(!this.context||!this.unlocked||this.disposed)return;
      const context=this.context,paused=this.hidden||this.held;
      try{
        if(paused&&context.state==='running')await context.suspend();
        else if(!paused&&context.state!=='running')await context.resume();
        if(this.disposed||context!==this.context||paused!==(this.hidden||this.held))return;
        if(paused)this.report('paused');else{if(this.active)this.report(this.level()?'playing':'muted');void this.pump();}
      }catch{if(!this.disposed)this.report('blocked');}
    });return this.pauseSync;
  }
  async unlock() {
    if (this.disposed) return;
    try {
      const context=this.ensureContext();
      this.unlocked = true;
      // Keep the first resume inside the actual user gesture, then reconcile delayed visibility work.
      if(!this.hidden&&!this.held&&context.state!=='running')await context.resume();
      await this.syncPause();
      if (this.master) this.ramp(this.master.gain, this.level(), 0.2);
      await this.pump();
    } catch {
      this.report("blocked");
    }
  }
  async prepare(key: MusicKey): Promise<void> {
    try {
      await this.buffer(key);
    } catch {
      /* A video must still play when music fails. */
    }
  }
  private async buffer(key: MusicKey): Promise<AudioBuffer> {
    const cached = this.buffers.get(key);
    if (cached) {
      this.buffers.delete(key);
      this.buffers.set(key, cached);
      return cached;
    }
    const existing = this.pending.get(key);
    if (existing&&this.requests.has(key)&&!this.requests.get(key)?.signal.aborted) return existing;
    const context = this.ensureContext(),
      controller = new AbortController();
    this.requests.set(key,controller);
    const timer = setTimeout(() => controller.abort(), 15000);
    const request:Promise<AudioBuffer> = (async () => {
      try {
        const buffer = await (this.deps.load
          ? this.deps.load(key, context, controller.signal)
          : (async () => {
              const response = await fetch(MUSIC[key].src, {
                signal: controller.signal,
              });
              if (!response.ok) throw Error("music unavailable");
              const bytes=await response.arrayBuffer();
              const previous=this.decoding;let release!:()=>void;
              this.decoding=new Promise<void>(resolve=>{release=resolve;});
              await previous;
              try{if(controller.signal.aborted||this.disposed)throw Error('cancelled');return await context.decodeAudioData(bytes);}finally{release();}
            })());
        if (this.disposed||controller.signal.aborted) throw Error("cancelled");
        this.buffers.set(key, buffer);
        // Bound decoded PCM retention; active sources retain their own buffers.
        while (this.buffers.size > 1)
          this.buffers.delete(this.buffers.keys().next().value!);
        return buffer;
      } finally {
        clearTimeout(timer);
        if(this.requests.get(key)===controller){this.requests.delete(key);this.pending.delete(key);}
      }
    })();
    this.pending.set(key, request);
    return request;
  }
  setTheme(key: MusicKey | null) {
    if (this.disposed || this.desired === key) return;
    if(key)for(const [other,request] of this.requests)if(other!==key)request.abort();
    this.desired = key;
    this.generation++;
    this.loading = false;
    this.fadeOut();
    if (!key) {
      this.report("idle");
      return;
    }
    if (this.unlocked) void this.pump();
  }
  private fadeOut() {
    if (!this.context) return;
    for (const voice of this.voices) {
      this.ramp(voice.gain.gain, 0, 0.65);
      try {
        voice.source.stop(this.context.currentTime + 0.65);
      } catch {
        /* Already ended. */
      }
    }
    this.active = null;
  }
  private async pump() {
    const key = this.desired;
    if (
      this.disposed ||
      !this.unlocked ||
      !key ||
      this.active?.key === key ||
      this.loading ||
      !this.level() ||
      this.hidden ||
      this.held
    )
      return;
    const ticket = this.generation;
    this.loading = true;
    this.report("loading");
    try {
      const buffer = await this.buffer(key);
      if (this.disposed || ticket !== this.generation || this.desired !== key)
        return;
      this.loading = false;
      if (this.hidden || this.held || !this.level()) return;
      const context = this.ensureContext();
      if (context.state !== "running") {
        this.report("blocked");
        return;
      }
      const hadVoices = this.voices.size > 0;
      this.fadeOut();
      const source = context.createBufferSource(),
        gain = context.createGain(),
        voice = { source, gain, key };
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = MUSIC[key].loopStart;
      source.loopEnd = buffer.duration;
      source.connect(gain);
      gain.connect(this.master!);
      const start = context.currentTime + (hadVoices ? 0.65 : 0);
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1, start + 0.8);
      this.voices.add(voice);
      this.active = voice;
      source.onended = () => {
        this.voices.delete(voice);
        source.disconnect();
        gain.disconnect();
        if (this.active === voice) this.active = null;
      };
      source.start(start);
      this.report("playing");
    } catch {
      if (ticket === this.generation) this.report("error");
    } finally {
      if (ticket === this.generation) this.loading = false;
    }
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    for (const request of this.requests.values()) request.abort();
    this.requests.clear();
    for (const voice of this.voices) {
      try {
        voice.source.stop();
      } catch {}
      voice.source.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
    this.active = null;
    this.buffers.clear();
    this.pending.clear();
    if(this.context)this.context.onstatechange=null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.master = null;
  }
}
