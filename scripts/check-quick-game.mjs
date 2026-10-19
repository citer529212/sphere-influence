import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({entryPoints:['src/game/quickGame.ts'],bundle:true,platform:'node',format:'esm',write:false});const g=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
let s=g.createQuickGame('2026-10-19');assert.deepEqual(s,g.createQuickGame(s.seed));assert.equal(s.regions.length,16);assert.equal(g.controlled(s),4);
const media=g.quickAction(s,s.regions[0].id,'media');assert.equal(media.influence,s.influence-g.actionCost(s,'media'));assert.equal(media.actions,1);assert.equal(s.regions[0].mediaNodes.atlas,0);assert.ok(g.actionError(media,media.regions[0],'media'));
const after=g.quickEndTurn(media);assert.equal(after.influence,media.influence+5);assert.equal(after.regions[0].influence.atlas,media.regions[0].influence.atlas+2);
const matched=g.setCampaignTopic(s,'freedoms'),mismatch=g.setCampaignTopic(s,'development');assert.equal(g.campaignGain(matched,s.regions[0])-g.campaignGain(mismatch,s.regions[0]),8,'Matching local agenda helps, mismatch hurts');assert.equal(matched.actions,s.actions);
const spent=g.quickAction(media,s.regions[0].id,'protect');assert.equal(spent.actions,0);assert.ok(g.actionError(spent,spent.regions[0],'attract'));assert.equal(g.quickAction(spent,spent.regions[0].id,'attract'),spent);
for(const difficulty of ['discovery','standard','expert']){
 let idle=g.createQuickGame('deadline','atlas',difficulty);const mode=g.objective(idle);for(let t=0;t<mode.limit;t++)idle=g.quickEndTurn(idle);assert.equal(idle.result,'loss');assert.equal(idle.turn,mode.limit);assert.equal(g.quickEndTurn(idle),idle);
 const setup=()=>{const state=g.createQuickGame('holding','atlas',difficulty);state.rivalBudget={atlas:0,meridian:0,concordat:0};state.trust=80;for(const r of state.regions.slice(0,mode.goal)){r.influence={atlas:100,meridian:0,concordat:0};r.infoController='atlas';}return state;};
 let qualified=setup();assert.equal(qualified.result,null,'Leading audiences does not win before end of turn');for(let i=0;i<mode.hold;i++)qualified=g.quickEndTurn(qualified);assert.equal(qualified.result,'win');assert.equal(qualified.held,mode.hold);
 const distrust=setup();distrust.trust=mode.trust-1;const noWin=g.quickEndTurn(distrust);assert.equal(noWin.held,0);assert.equal(noWin.result,null,'City count cannot replace public trust');
}
const tied=g.createQuickGame('tie');tied.regions[0].influence={atlas:100,meridian:100,concordat:0};tied.regions[0].infoController='contested';const resolved=g.quickAction(tied,tied.regions[0].id,'attract');assert.ok(resolved.regions[0].influence.meridian<100,'Competition must resolve saturated approval ties');
let advanced=g.createQuickGame('editorial');advanced.turn=9;advanced.regions.slice(0,2).forEach(r=>r.mediaNodes.atlas=1);assert.equal(g.decisionLimit(advanced),2);const upgraded=g.quickAction(advanced,advanced.regions[2].id,'media');assert.equal(g.decisionLimit(upgraded),3);assert.equal(upgraded.actions,2,'Third newsroom unlocks exactly one extra decision');
console.log('Information rules passed: deterministic starts, resources, fatigue, topic relevance, passive newsrooms, end-of-turn hold, trust gate, deadlines, tie resolution and network progression.');
