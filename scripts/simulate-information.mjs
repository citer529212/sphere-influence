import { build } from "esbuild";
const bundled = await build({
  entryPoints: ["src/game/quickGame.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const g = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundled.outputFiles[0].text).toString("base64")
);
const infoBundle = await build({
  entryPoints: ["src/game/information.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const info = await import(
  "data:text/javascript;base64," +
    Buffer.from(infoBundle.outputFiles[0].text).toString("base64")
);
export function play(seed, player, difficulty, options = {}) {
  let state = g.createQuickGame(seed, player, difficulty),
    history = [],
    plan = [];
  while (!state.result) {
    for (let i = 0; i < g.decisionLimit(state); i++) {
      const mode = g.objective(state),
        reachable = g.mediaReach(state),
        centers = state.regions.filter(
          (r) => r.infoController === player && r.mediaNodes[player],
        ).length;
      const targets = state.regions
        .filter((r, j) => reachable.has(j) && r.infoController !== player)
        .sort(
          (a, b) =>
            g.supportNeeded(a, player) +
            a.fatigue * (options.fatigue ?? 0.25) -
            (g.supportNeeded(b, player) +
              b.fatigue * (options.fatigue ?? 0.25)),
        );
      const target =
        targets[0] ??
        state.regions
          .filter((r) => r.infoController === player)
          .sort((a, b) => a.influence[player] - b.influence[player])[0];
      const center = state.regions
        .filter((r) => r.infoController === player && !r.mediaNodes[player])
        .sort((a, b) => a.influence[player] - b.influence[player])[0];
      let action, region;
      if (state.trust < mode.trust + (options.margin ?? 8)) {
        action = "protect";
        region = target;
      } else if (
        centers < (options.centers ?? 3) &&
        state.turn < 9 &&
        center &&
        !g.actionError(state, center, "media")
      ) {
        action = "media";
        region = center;
      } else {
        action = "attract";
        region = target;
        state = g.setCampaignTopic(state, g.bestCampaignTopic(state, target));
      }
      if (g.actionError(state, region, action)) {
        if (!g.actionError(state, target, "protect")) {
          action = "protect";
          region = target;
        } else break;
      }
      plan.push({
        turn: state.turn,
        id: region.id,
        action,
        topic: state.topic,
      });
      state = g.quickAction(state, region.id, action);
    }
    const previousTurn = state.turn;
    state = g.quickEndTurn(state);
    plan.push({
      end: true,
      turn: previousTurn,
      nextTurn: state.turn,
      cities: g.controlled(state),
      trust: state.trust,
      held: state.held,
      result: state.result,
    });
    history.push({
      turn: state.turn,
      cities: g.controlled(state),
      trust: state.trust,
      held: state.held,
    });
  }
  return {
    difficulty,
    player,
    seed,
    result: state.result,
    turn: state.turn,
    cities: g.controlled(state),
    trust: state.trust,
    history,
    plan,
  };
}
if (process.argv[1]?.endsWith("simulate-information.mjs"))
  for (const difficulty of ["discovery", "standard", "expert"])
    for (const player of ["atlas", "meridian", "concordat"]) {
      const result = play("2026-10-19", player, difficulty);
      console.log(
        JSON.stringify({ ...result, history: undefined, plan: undefined }),
      );
    }
