import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
const b = await build({
  stdin: {
    contents:
      "export * from './src/ui/music';export * from './src/ui/musicAssets';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const {
  MusicPlayer,
  MUSIC,
  musicForScreen,
  loadMusicPreferences,
  saveMusicPreferences,
  DEFAULT_MUSIC,
} = await import(
  "data:text/javascript;base64," +
    Buffer.from(b.outputFiles[0].text).toString("base64")
);
const tick = async () => {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
};
class Param {
  value = 0;
  events = [];
  setValueAtTime(value, time) {
    this.value = value;
    this.events.push({ kind: "set", value, time });
  }
  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push({ kind: "ramp", value, time });
  }
  cancelAndHoldAtTime(time) {
    this.events.push({ kind: "hold", time });
  }
}
class Node {
  gain = new Param();
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
}
class Source extends Node {
  start(time) {
    assert.equal(this.started, undefined);
    this.started = time;
  }
  stop(time = 0) {
    this.stopped = time;
  }
}
class Context {
  currentTime = 0;
  state = "suspended";
  destination = {};
  sources = [];
  gains = [];
  resumes = 0;
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createBufferSource() {
    const n = new Source();
    this.sources.push(n);
    return n;
  }
  async resume() {
    this.resumes++;
    if (this.blocked) throw Error("gesture required");
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
  async close() {
    this.state = "closed";
  }
  advance(seconds) {
    this.currentTime += seconds;
    for (const source of this.sources)
      if (!source.ended && source.stopped <= this.currentTime) {
        source.ended = true;
        source.onended?.();
      }
  }
}
function rig(extra = {}) {
  const context = new Context(),
    loads = [],
    statuses = [];
  const player = new MusicPlayer({
    context: () => context,
    load: async (key) => {
      loads.push(key);
      return { duration: 120 };
    },
    status: (s) => statuses.push(s),
    ...extra,
  });
  return { context, loads, statuses, player };
}
assert.equal(musicForScreen(true, null, "atlas", null, false), "menu");
for (const faction of ["atlas", "meridian", "concordat"]) {
  assert.equal(musicForScreen(true, faction, "atlas", null, false), faction);
  assert.equal(
    musicForScreen(false, null, faction, null, false),
    faction,
    "Saved ruler restores theme",
  );
  assert.equal(
    musicForScreen(false, null, faction, "win", false),
    `victory-${faction}`,
  );
  assert.equal(
    musicForScreen(false, null, faction, "win", true),
    faction,
    "Wait for animated turn completion",
  );
  assert.equal(musicForScreen(false, null, faction, "loss", false), "loss");
}
assert.equal(musicForScreen(true,null,'meridian',null,false,false),'meridian','Opening ruler dialog must keep current game music until a preview is chosen');
assert.equal(musicForScreen(true,null,'atlas','loss',false,false),'loss','Opening dialog must keep the result theme');
const values = new Map(),
  storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
assert.deepEqual(loadMusicPreferences(storage), DEFAULT_MUSIC);
saveMusicPreferences(storage, { enabled: false, volume: 0.72 });
assert.deepEqual(loadMusicPreferences(storage), {
  enabled: false,
  volume: 0.72,
});
values.set("spheres.music.v1", '{"enabled":true,"volume":9}');
assert.deepEqual(loadMusicPreferences(storage), DEFAULT_MUSIC);
const denied = {
  getItem() {
    throw Error();
  },
  setItem() {
    throw Error();
  },
};
assert.deepEqual(loadMusicPreferences(denied), DEFAULT_MUSIC);
saveMusicPreferences(denied, DEFAULT_MUSIC);
{
  const { player, context, loads } = rig();
  player.setTheme("menu");
  await tick();
  assert.equal(loads.length, 0, "No autoplay before interaction");
  await player.unlock();
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].loop, true);
  assert.equal(context.sources[0].loopStart, 0);
  for (let i = 0; i < 40; i++) {
    player.setTheme("menu");
    await player.unlock();
  }
  assert.equal(
    context.sources.length,
    1,
    "UI rerenders and gestures must not restart",
  );
  context.advance(10);
  player.setTheme("atlas");
  await tick();
  assert.equal(context.sources.length, 2);
  assert.ok(
    context.sources[0].stopped <= context.sources[1].started,
    "Old and new themes must not overlap",
  );
  assert.ok(
    context.gains[2].gain.events.some(
      (e) => e.kind === "ramp" && e.value === 1,
    ),
    "New source must fade in",
  );
  player.setPreferences({ enabled: false, volume: 0.2 });
  assert.equal(context.gains[0].gain.value, 0);
  player.setPreferences({ enabled: true, volume: 0.2 });
  await tick();
  assert.equal(context.sources.length, 2, "Unmute keeps playhead");
  player.setDucked(true);
  assert.equal(context.gains[0].gain.value, 0);
  player.setDucked(false);
  await tick();
  assert.equal(context.sources.length, 2);
  player.setHidden(true);
  await tick();
  assert.equal(context.state, "suspended");
  player.setHidden(false);
  await tick();
  assert.equal(context.state, "running");
  assert.equal(context.sources.length, 2, "Tab resume keeps playhead");
  player.setHeld(true);
  await tick();
  assert.equal(context.state, "suspended");
  player.setHeld(false);
  await tick();
  assert.equal(context.sources.length, 2);
  context.advance(5);
  await player.prepare("victory-atlas");
  const before = context.sources.length;
  player.setTheme("victory-atlas");
  await tick();
  assert.equal(context.sources.length, before + 1);
  assert.equal(
    context.sources.at(-1).loopStart,
    8,
    "Do not repeat celebration intro",
  );
  player.setTheme("victory-atlas");
  await player.unlock();
  assert.equal(
    context.sources.length,
    before + 1,
    "Video to results must keep same source",
  );
  player.setTheme("loss");
  await tick();
  assert.equal(loads.at(-1), "loss");
  player.dispose();
  assert.equal(context.state, "closed");
  assert.ok(
    context.sources.every((s) => s.stopped !== undefined && s.disconnected),
  );
  await player.unlock();
  assert.equal(context.sources.length, before + 2);
}
{
  const resolves = new Map();
  const r = rig({
    load: (key) => new Promise((resolve) => resolves.set(key, resolve)),
  });
  r.player.setTheme("atlas");
  void r.player.unlock();
  await tick();
  r.player.setTheme("meridian");
  await tick();
  resolves.get("meridian")({ duration: 100 });
  await tick();
  resolves.get("atlas")({ duration: 100 });
  await tick();
  assert.equal(
    r.context.sources.length,
    1,
    "Stale request must never replace chosen theme",
  );
  assert.equal(r.loads.length, 0);
  r.player.dispose();
}
{
  let fail = true;
  const r = rig({
    load: async () => {
      if (fail) throw Error("network");
      return { duration: 100 };
    },
  });
  r.player.setTheme("atlas");
  await r.player.unlock();
  assert.ok(r.statuses.includes("error"));
  assert.equal(r.context.sources.length, 0);
  fail = false;
  await r.player.unlock();
  assert.equal(
    r.context.sources.length,
    1,
    "Gesture retries failed audio without restarting game",
  );
  r.player.dispose();
}
{
  const r = rig();
  r.context.blocked = true;
  r.player.setTheme("atlas");
  await r.player.unlock();
  assert.ok(r.statuses.includes("blocked"));
  assert.equal(r.context.sources.length, 0);
  r.context.blocked = false;
  await r.player.unlock();
  assert.equal(r.context.sources.length, 1);
  r.player.dispose();
}
{
  const r = rig();
  r.player.setPreferences({ enabled: false, volume: 0.5 });
  r.player.setTheme("atlas");
  await r.player.unlock();
  assert.equal(r.context.sources.length, 0);
  r.player.setPreferences({ enabled: true, volume: 0.5 });
  await tick();
  assert.equal(r.context.sources.length, 1);
  r.player.dispose();
}
// Exercise the real controller for every ruler and both result paths.
for(const faction of ['atlas','meridian','concordat']){
 const r=rig();r.player.setTheme(faction);await r.player.unlock();r.context.advance(10);
 r.player.setTheme(null);r.context.advance(1);await r.player.prepare(`victory-${faction}`);
 r.player.setTheme(`victory-${faction}`);await tick();assert.equal(r.context.sources.at(-1).loopStart,8);
 const count=r.context.sources.length;r.context.advance(6);r.player.setTheme(`victory-${faction}`);await tick();assert.equal(r.context.sources.length,count);
 r.player.setTheme('loss');await tick();assert.equal(r.loads.at(-1),'loss');r.player.dispose();
}
// A mute or a tab switch while decoding must not create a late audible source.
{
 let ready;const r=rig({load:()=>new Promise(resolve=>ready=resolve)});r.player.setTheme('atlas');void r.player.unlock();await tick();
 r.player.setHidden(true);ready({duration:100});await tick();assert.equal(r.context.sources.length,0);
 r.player.setHidden(false);await tick();assert.equal(r.context.sources.length,1);r.player.dispose();
}
const manifest = JSON.parse(readFileSync("public/music/manifest.json", "utf8"));
assert.equal(manifest.length, 8);
for (const item of manifest) {
  const track = MUSIC[item.key];
  assert.ok(track);
  assert.equal(track.title, item.title);
  assert.equal(track.isrc, item.isrc);
  assert.equal(track.loopStart, item.loopStart);
  assert.ok(existsSync("public/" + track.src.slice(2)));
  assert.equal(item.license, "CC BY 4.0");
  if (!process.env.SKIP_FFMPEG) {
    const decoded = spawnSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-i",
        "public/" + track.src.slice(2),
        "-f",
        "f32le",
        "-ac",
        "2",
        "-ar",
        "44100",
        "-",
      ],
      { maxBuffer: 150 * 1024 * 1024 },
    );
    assert.equal(decoded.status, 0, decoded.stderr.toString());
    const a = new Float32Array(
      decoded.stdout.buffer,
      decoded.stdout.byteOffset,
      decoded.stdout.byteLength / 4,
    );
    let peak = 0;
    for (const v of a) {
      assert.ok(Number.isFinite(v));
      peak = Math.max(peak, Math.abs(v));
    }
    assert.ok(peak < 0.99, "No clipped processing output");
    const loop = Math.round(item.loopStart * 44100) * 2;
    const seam = Math.max(
      Math.abs(a.at(-2) - a[loop]),
      Math.abs(a.at(-1) - a[loop + 1]),
    );
    assert.ok(seam < 0.04, `${item.key}: wrap jump ${seam}`);
    assert.ok(
      Math.abs(a.length / 88200 - item.duration) < 0.08,
      "Decoded duration must match edit manifest",
    );
  }
}
console.log(
  "Music checks passed: eight identified recordings, all screen/ruler mappings, persisted settings, autoplay gate, no UI restarts, sequential fades, stale-load rejection, mute/duck, pause/resume, victory continuity, one-time intro, failures/retry, cleanup and decoded loop boundaries. Browser listening remains a separate manual check.",
);
