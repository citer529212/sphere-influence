import assert from "node:assert/strict";
import { build } from "esbuild";
const b = await build({
  entryPoints: ["src/game/quickGame.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const g = await import(
  "data:text/javascript;base64," +
    Buffer.from(b.outputFiles[0].text).toString("base64")
);
const s = g.createQuickGame("network"),
  foreign = s.regions[8];
assert.ok(!g.mediaReach(s).has(8));
assert.match(g.actionError(s, foreign, "attract"), /охвата/);
assert.equal(g.quickAction(s, foreign.id, "attract"), s);
const local = s.regions[0],
  center = g.quickAction(s, local.id, "media");
assert.ok(
  g.mediaReach(center).has(8),
  "Two-link editorial relay reaches a formerly unavailable audience",
);
assert.ok(g.networkBonus(center, center.regions[1]) > 0);
const event = structuredClone(s);
event.turn = 5;
assert.ok(
  g.campaignGain(event, event.regions[0], "atlas", "development") >
    g.campaignGain(event, event.regions[0], "atlas", "freedoms"),
  "A global event can outweigh the usual local agenda",
);
const first = g.quickAction(
  g.setCampaignTopic(s, "freedoms"),
  local.id,
  "attract",
);
assert.equal(g.repeatPenalty(first, first.regions[0], "freedoms"), 8);
assert.equal(g.repeatPenalty(first, first.regions[0], "stability"), 0);
assert.equal(
  g.repeatPenalty(s, local, "freedoms"),
  0,
  "Campaign memory must not mutate the input",
);
const repeated = g.quickAction(first, local.id, "attract");
assert.equal(g.repeatPenalty(repeated, repeated.regions[0], "freedoms"), 16);
const shield = structuredClone(s);
shield.regions[0].factCheckShield.meridian = 1;
const blocked = g.quickAction(shield, local.id, "attract");
assert.deepEqual(
  blocked.campaigns,
  {},
  "Blocked campaigns do not count as a delivered repeated message",
);
const trade = s.regions[1],
  trading = g.quickAction(s, trade.id, "media");
assert.equal(
  g.turnIncome(trading) - g.turnIncome(s),
  2,
  "Trade hub newsroom gives two income",
);
const university = s.regions[2],
  verified = g.quickAction(s, university.id, "protect");
assert.equal(
  verified.trust - s.trust,
  8,
  "Leading a university audience improves fact-check trust recovery",
);
const independent = g.quickAction(s, s.regions[3].id, "media"),
  round = g.quickEndTurn(independent);
assert.equal(
  round.regions[3].influence.atlas - independent.regions[3].influence.atlas,
  3,
  "Independent newsroom reinforces three support",
);
const outlook = g.rivalOutlook(s, "meridian");
assert.equal(outlook.cities, 4);
assert.ok(outlook.target);
assert.equal(s.actions, 2, "Reading rival intentions must not spend actions");
const distant = structuredClone(s);
distant.regions[8].influence.atlas = 25;
const faded = g.quickEndTurn(distant);
assert.equal(
  faded.regions[8].influence.atlas,
  23,
  "Unsupported foreign audience fades without coverage",
);
const neutral = g.setCampaignTopic(s, "stability");
let expanded = g.quickAction(neutral, neutral.regions[12].id, "attract");
assert.equal(expanded.regions[12].politicalOwner, "neutral");
assert.equal(expanded.regions[12].infoController, "contested");
expanded = g.quickAction(expanded, expanded.regions[12].id, "attract");
assert.equal(expanded.regions[12].infoController, "atlas");
assert.ok(g.mediaReach(expanded).has(4));
const { play } = await import("./simulate-information.mjs");
for (const player of ["atlas", "meridian", "concordat"]) {
  const easy = play("2026-10-19", player, "discovery"),
    normal = play("2026-10-19", player, "standard");
  assert.equal(easy.result, "win");
  assert.equal(normal.result, "win");
  assert.ok(
    normal.turn > easy.turn,
    "Normal mode should require more sustained decisions",
  );
  const hard = play(
    "2026-10-19",
    player,
    "expert",
    player === "concordat" ? {} : { centers: 3, margin: 4, fatigue: 0 },
  );
  assert.equal(
    hard.result,
    "win",
    `A tested strategy can win expert as ${player}`,
  );
  assert.ok(hard.turn > normal.turn);
  console.log(
    `${player}: discovery ${easy.turn}, standard ${normal.turn}, expert witness ${hard.turn} turns`,
  );
}
console.log(
  "Information checks passed: media reach, relay expansion, unsupported support decay, independent neutral audiences and viable strategies for all modes/rulers.",
);
