import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const g=await load('src/game/quickGame.ts'),r=await load('src/game/realms.ts'),t=await load('src/world/terrain.ts');
t.CITY_SITES.forEach((p,i)=>assert.equal(t.climateAt(p.x,p.y),r.CITY_CLIMATES[i]));
for(const player of ['atlas','meridian','concordat']){const s=g.createQuickGame('realm',player),home=s.regions.find(r=>r.infoController===player);assert.equal(g.controlled(s),4);assert.equal(g.actionCost(s,'media'),r.REALMS[player].mediaCost);const p=g.quickAction(s,home.id,'protect');assert.equal(p.trust-s.trust,r.REALMS[player].trustRecovery);assert.equal(p.regions.find(r=>r.id===home.id).influence[player]-home.influence[player],r.REALMS[player].protection);const a=g.quickAction(s,home.id,'attract');assert.equal(s.trust-a.trust,r.REALMS[player].trustCost);assert.equal(a.regions.find(r=>r.id===home.id).fatigue,r.REALMS[player].fatigue);}
assert.equal(r.climateEffect(7,0),-3);assert.equal(r.climateEffect(3,3),-3);assert.equal(r.climateEffect(5,10),-2);
console.log('Realm checks passed: three distinct editorial economies, trust recovery, fatigue and matching visual/game climates.');
