import assert from "node:assert/strict";
import { build } from "esbuild";
async function load(path) {
  const b = await build({
    entryPoints: [path],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  return import(
    "data:text/javascript;base64," +
      Buffer.from(b.outputFiles[0].text).toString("base64")
  );
}
const g = await load("src/game/quickGame.ts"),
  session = await load("src/game/session.ts");
let s = g.createQuickGame("events-race");
for (let i = 0; i < 3; i++) s = g.quickEndTurn(s);
assert.equal(s.turn, 4);
const event = g.pendingWorldEvent(s);
assert.ok(event);
assert.deepEqual(event, g.pendingWorldEvent(structuredClone(s)));
assert.equal(g.quickEndTurn(s), s, "A pending event blocks ending the turn");
assert.equal(
  g.quickAction(s, s.regions[0].id, "protect"),
  s,
  "A pending event blocks ordinary actions",
);
assert.equal(g.resolveWorldEvent(s, "unknown"), s);
const bankrupt = structuredClone(s);
bankrupt.influence = 0;
assert.equal(g.resolveWorldEvent(bankrupt, "verify"), bankrupt);
assert.notEqual(
  g.resolveWorldEvent(bankrupt, "listen"),
  bankrupt,
  "There is always a free answer",
);
for (const option of event.options) {
  const before = structuredClone(s),
    after = g.resolveWorldEvent(s, option.id),
    target = after.regions.find((r) => r.id === event.region.id);
  assert.deepEqual(s, before);
  assert.equal(after.actions, s.actions);
  assert.equal(after.influence, s.influence + option.resource);
  assert.equal(after.trust, Math.max(0, Math.min(100, s.trust + option.trust)));
  assert.equal(
    target.influence[s.player],
    Math.min(100, event.region.influence[s.player] + option.support),
  );
  assert.equal(after.eventTurn, 4);
  assert.equal(g.pendingWorldEvent(after), null);
  assert.equal(
    g.resolveWorldEvent(after, option.id),
    after,
    "Only one answer per event",
  );
  const map = new Map(),
    storage = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => map.set(k, v),
    };
  session.saveSession(storage, after, target.id);
  assert.deepEqual(session.loadSession(storage, after.seed).game, after);
  assert.equal(
    g.pendingWorldEvent(session.loadSession(storage, after.seed).game),
    null,
  );
}
const answered = g.resolveWorldEvent(s, "listen"),
  frames = g.planQuickEndTurn(answered);
assert.equal(frames.filter((f) => f.event.kind === "event").length, 2);
assert.deepEqual(frames.at(-1).state, g.quickEndTurn(answered));
assert.equal(frames.at(-1).state.turn, 5);
function lead(difficulty = "standard") {
  const state = g.createQuickGame("rival-wins", "atlas", difficulty);
  state.rivalBudget = { atlas: 0, meridian: 0, concordat: 0 };
  for (let i = 0; i < 8; i++) {
    const r = state.regions[i];
    r.influence = { atlas: 0, meridian: 100, concordat: 0 };
    r.infoController = "meridian";
  }
  state.rivalTrust.meridian = 80;
  return state;
}
let race = g.quickEndTurn(lead());
assert.equal(race.result, null);
assert.equal(race.rivalHeld.meridian, 1, "One completed round only warns");
race = g.quickEndTurn(race);
assert.equal(race.result, "loss");
assert.equal(race.winner, "meridian");
assert.equal(race.turn, 2, "A rival can win before the deadline");
const map = new Map(),
  storage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
session.saveSession(storage, race, race.regions[0].id);
assert.deepEqual(
  session.loadSession(storage, race.seed).game,
  race,
  "Early rival loss can be restored",
);
const disrupted = g.quickEndTurn(lead());
disrupted.rivalBudget = { atlas: 0, meridian: 0, concordat: 0 };
disrupted.regions[0].influence = { atlas: 100, meridian: 0, concordat: 0 };
disrupted.regions[0].infoController = "atlas";
disrupted.regions[1].influence = { atlas: 100, meridian: 0, concordat: 0 };
disrupted.regions[1].infoController = "atlas";
assert.equal(
  g.quickEndTurn(disrupted).rivalHeld.meridian,
  0,
  "Removing one audience resets the rival hold",
);
const distrust = lead();
distrust.rivalTrust.meridian = 20;
assert.equal(g.quickEndTurn(distrust).rivalHeld.meridian, 0);
const easy = g.quickEndTurn(g.quickEndTurn(lead("discovery")));
assert.equal(easy.result, null);
assert.equal(easy.winner, null, "Training remains forgiving");
const simultaneous = lead("expert");
for (let i = 8; i < 16; i++) {
  simultaneous.regions[i].influence = { atlas: 0, meridian: 0, concordat: 100 };
  simultaneous.regions[i].infoController = "concordat";
}
simultaneous.rivalTrust.concordat = 80;
const middle = g.quickEndTurn(simultaneous);
middle.rivalBudget = { atlas: 0, meridian: 0, concordat: 0 };
const tied = g.quickEndTurn(middle);
assert.equal(tied.winner, null, "Equal rival contenders continue the race");
for (const difficulty of ["standard", "expert"]) {
  let idle = g.createQuickGame("idle-0", "atlas", difficulty);
  while (!idle.result) {
    if (g.pendingWorldEvent(idle)) idle = g.resolveWorldEvent(idle, "listen");
    idle = g.quickEndTurn(idle);
  }
  assert.equal(idle.result, "loss");
  assert.ok(idle.winner && idle.winner !== "atlas");
  assert.ok(
    idle.turn < g.objective(idle).limit,
    "Rivals can win a real unmodified starting scenario before time runs out",
  );
}
console.log(
  "Events and race passed: exact consequences, affordability, once-only save/reload, pending turn guard, AI responses, early rival victory, trust gate, hold reset, ties and training.",
);
