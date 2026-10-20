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
const api = await load("src/game/session.ts"),
  g = await load("src/game/quickGame.ts");
const values = new Map(),
  storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
for (const difficulty of ["discovery", "standard", "expert"]) {
  let game = g.createQuickGame("same-map", "meridian", difficulty);
  game = g.quickEndTurn(game);
  assert.ok(api.saveSession(storage, game, game.regions[5].id));
  assert.deepEqual(api.loadSession(storage, game.seed, difficulty).game, game);
}
assert.equal(
  values.size,
  4,
  "Three difficulties keep independent saves plus last-map metadata",
);
assert.equal(
  api.startSession(storage, undefined, "next-day").session.game.difficulty,
  "expert",
);
const key = "spheres.session.v5:same-map:standard",
  valid = values.get(key);
for (const change of [
  (v) => (v.rules = "3"),
  (v) => (v.game.difficulty = "expert"),
  (v) => (v.game.topic = "__proto__"),
  (v) =>
    (v.game.campaigns = {
      "atlas:mist-isles": { topic: "freedoms", repeats: 3 },
    }),
  (v) => (v.game.held = 99),
  (v) => (v.game.actions = 4),
  (v) => (v.game.rivalBudget.atlas = -1),
  (v) => (v.game.rivalTrust.atlas = 101),
  (v) => (v.game.regions[0].infoController = "concordat"),
  (v) => (v.game.result = "win"),
]) {
  const value = JSON.parse(valid);
  change(value);
  values.set(key, JSON.stringify(value));
  assert.ok(
    api.loadSession(storage, "same-map") === null,
    "Malformed saves must be rejected",
  );
}
values.set(key, valid);
const mid = api.loadSession(storage, "same-map").game;
mid.held = 1;
mid.trust = 1;
api.saveSession(storage, mid, mid.regions[0].id);
assert.ok(
  api.loadSession(storage, "same-map"),
  "A current decision can temporarily fall below trust after a valid previous held turn",
);
api.savePreferences(storage, { sound: false, tutorialStep: 2 });
assert.deepEqual(api.loadPreferences(storage), {
  sound: false,
  tutorialStep: 2,
});
assert.equal(api.saveSession(null, mid, ""), false);
const blocked = {
  getItem() {
    throw Error("denied");
  },
  setItem() {
    throw Error("denied");
  },
};
assert.equal(api.startSession(blocked, undefined, "fresh").restored, false);
console.log(
  "Session checks passed: per-difficulty saves, AI budgets/trust, topics, held rounds, strict validation, interrupted turns and unavailable storage.",
);
