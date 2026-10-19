import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({entryPoints:['src/game/quickGame.ts'],bundle:true,platform:'node',format:'esm',write:false});const g=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const s=g.createQuickGame('network'),foreign=s.regions[8];assert.ok(!g.mediaReach(s).has(8));assert.match(g.actionError(s,foreign,'attract'),/охвата/);assert.equal(g.quickAction(s,foreign.id,'attract'),s);
const local=s.regions[0],center=g.quickAction(s,local.id,'media');assert.ok(g.mediaReach(center).has(8),'Two-link editorial relay reaches a formerly unavailable audience');assert.ok(g.networkBonus(center,center.regions[1])>0);
const distant=structuredClone(s);distant.regions[8].influence.atlas=25;const faded=g.quickEndTurn(distant);assert.equal(faded.regions[8].influence.atlas,23,'Unsupported foreign audience fades without coverage');
const neutral=g.setCampaignTopic(s,'stability');let expanded=g.quickAction(neutral,neutral.regions[12].id,'attract');assert.equal(expanded.regions[12].politicalOwner,'neutral');assert.equal(expanded.regions[12].infoController,'contested');expanded=g.quickAction(expanded,expanded.regions[12].id,'attract');assert.equal(expanded.regions[12].infoController,'atlas');assert.ok(g.mediaReach(expanded).has(4));
const {play}=await import('./simulate-information.mjs');
for(const player of ['atlas','meridian','concordat']){
 const easy=play('2026-10-19',player,'discovery'),normal=play('2026-10-19',player,'standard');assert.equal(easy.result,'win');assert.equal(normal.result,'win');assert.ok(normal.turn>easy.turn,'Normal mode should require more sustained decisions');
 const hard=play('2026-10-19',player,'expert',player==='concordat'?{}:{centers:3,margin:4,fatigue:0});assert.equal(hard.result,'win',`A tested strategy can win expert as ${player}`);assert.ok(hard.turn>normal.turn);
 console.log(`${player}: discovery ${easy.turn}, standard ${normal.turn}, expert witness ${hard.turn} turns`);
}
console.log('Information checks passed: media reach, relay expansion, unsupported support decay, independent neutral audiences and viable strategies for all modes/rulers.');
