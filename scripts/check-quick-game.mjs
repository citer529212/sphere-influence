import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: ['src/game/quickGame.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { createQuickGame, quickAction, quickEndTurn, controlled, actionError } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const initial = createQuickGame('2026-10-17');
assert.deepEqual(initial, createQuickGame('2026-10-17'));
assert.equal(initial.regions.length, 16);
assert.equal(controlled(initial), 4);
const media = quickAction(initial, initial.regions[0].id, 'media');
assert.equal(media.influence, 8);
assert.equal(media.actions, 1);
assert.equal(initial.influence, 12, 'Actions must not mutate prior state');
assert.ok(actionError(media, media.regions[0], 'media'), 'Duplicate centers must be blocked');
assert.ok(actionError(initial, initial.regions[7], 'media'), 'Rival cities cannot host your center');
const next = quickEndTurn(media);
assert.equal(next.turn, 2);
assert.equal(next.actions, 2);
assert.equal(next.influence, 13, 'Income includes the active media center');
const protectedGame = quickAction(initial, initial.regions[0].id, 'protect');
assert.equal(protectedGame.trust, 66);
assert.equal(protectedGame.regions[0].factCheckShield.atlas, 1);
assert.equal(quickEndTurn(protectedGame).regions[0].factCheckShield.atlas, 0);
let loss = createQuickGame('test');
for (let i = 0; i < 15; i++) loss = quickEndTurn(loss);
assert.equal(loss.result, 'loss');
assert.equal(loss.turn, 15);
assert.equal(quickEndTurn(loss), loss, 'Finished games cannot advance');
const samples = [];
for (const seed of ['2026-10-17', '2026-10-18', '2026-10-19']) {
  let game = createQuickGame(seed);
  game = quickAction(game, game.regions[0].id, 'media');
  game = quickAction(game, game.regions[1].id, 'media');
  assert.ok(actionError(game, game.regions[2], 'attract'), 'Two decisions exhaust the turn');
  game = quickEndTurn(game);
  while (!game.result) {
    for (let i = 0; i < 2 && !game.result; i++) {
      const target = game.regions.filter(r => r.infoController !== 'atlas').sort((a,b) => (Math.max(a.influence.meridian,a.influence.concordat)-a.influence.atlas) - (Math.max(b.influence.meridian,b.influence.concordat)-b.influence.atlas))[0];
      if (target && !actionError(game,target,'attract')) game = quickAction(game,target.id,'attract');
    }
    if (!game.result) game = quickEndTurn(game);
  }
  assert.equal(game.result, 'win', `A simple economy-first strategy must win ${seed}`);
  assert.ok(controlled(game) >= 8);
  samples.push(`${seed}: victory on turn ${game.turn}`);
}
console.log('Quick game checks passed: determinism, costs, action limits, income, shields, loss, victory, immutable state.');
console.log(samples.join('\n'));
