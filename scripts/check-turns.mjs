import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const b=await build({entryPoints:['src/game/quickGame.ts'],bundle:true,platform:'node',format:'esm',write:false});const g=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
for(const difficulty of ['discovery','standard','expert']){
 const start=g.createQuickGame('rival-turns','atlas',difficulty),original=structuredClone(start),frames=g.planQuickEndTurn(start);assert.equal(frames.length,difficulty==='expert'?5:3);assert.deepEqual(start,original);assert.deepEqual(frames,g.planQuickEndTurn(start));assert.deepEqual(frames.at(-1).state,g.quickEndTurn(start));
 for(const frame of frames.slice(0,-1)){assert.notEqual(frame.event.actor,start.player);assert.equal(frame.state.turn,1);assert.ok(frame.state.rivalBudget[frame.event.actor]>=0);frame.state.regions.forEach((r,i)=>assert.equal(r.politicalOwner,start.regions[i].politicalOwner,'Information campaigns cannot change political ownership'));}
 assert.equal(frames.at(-1).event.kind,'income');assert.equal(frames.at(-1).state.turn,2);
}
const shield=g.createQuickGame('shield'),region=shield.regions[0];region.factCheckShield.meridian=1;const blocked=g.quickAction(shield,region.id,'attract');assert.equal(blocked.regions[0].influence.atlas,region.influence.atlas);assert.equal(blocked.regions[0].factCheckShield.meridian,0);assert.equal(blocked.influence,shield.influence-3);assert.equal(blocked.actions,1);
for(const [name,count] of [['atlas',8],['meridian',7],['concordat',8],['neutral',4]]){const svg=readFileSync(`public/continent-${name}.svg`,'utf8');assert.equal((svg.match(/<path d="M/g)??[]).length,1+count*2);}
console.log('Turn checks passed: sequential rival decisions, bounded resources, political borders, one-use fact-check defenses, skip-equivalent final state and geographic opening fragments.');
