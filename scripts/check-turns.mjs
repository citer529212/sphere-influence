import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
async function load(path){const b=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const {createQuickGame,quickAction,quickEndTurn,planQuickEndTurn,regionController,supportNeeded,NEUTRAL_SUPPORT,QUICK_TOTAL}=await load('src/game/quickGame.ts');
const {saveSession,loadSession}=await load('src/game/session.ts');
const {CITY_SITES,isNeutralLand}=await load('src/world/terrain.ts');
for(const player of ['atlas','meridian','concordat']){
 const initial=createQuickGame('neutral-turns',player),original=structuredClone(initial);
 assert.equal(initial.regions.length,QUICK_TOTAL);assert.equal(QUICK_TOTAL,16);
 assert.equal(initial.regions.filter(r=>r.politicalOwner==='neutral').length,4);
 const neutral=initial.regions[12];assert.equal(neutral.infoController,'contested');
 assert.equal(supportNeeded(neutral,player),NEUTRAL_SUPPORT-8);
 let captured=quickAction(initial,neutral.id,'attract');assert.equal(captured.regions[12].infoController,'contested','One action cannot bypass neutral resistance');
 captured=quickAction(captured,neutral.id,'attract');assert.equal(captured.regions[12].infoController,player,'All factions can capture a neutral island city');
 assert.deepEqual(initial,original,'Actions and turn planning never mutate the starting snapshot');
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 saveSession(storage,captured,neutral.id);assert.deepEqual(loadSession(storage,initial.seed).game,captured,'Neutral capture survives canonical save validation');
 const frames=planQuickEndTurn(initial);assert.equal(frames.length,3);assert.deepEqual(frames,planQuickEndTurn(initial));
 let previous=initial;
 for(const frame of frames.slice(0,2)){
  assert.notEqual(frame.event.actor,player);assert.equal(frame.state.turn,initial.turn,'Opponent actions happen before the player turn advances');
  for(const [i,region] of frame.state.regions.entries())for(const faction of ['atlas','meridian','concordat']){
   const delta=region.influence[faction]-previous.regions[i].influence[faction];
   if(delta){assert.equal(faction,frame.event.actor);assert.equal(region.id,frame.event.regionId);assert.equal(delta,frame.event.amount);}
  }
  assert.ok(frame.event.regionId);previous=frame.state;
 }
 assert.equal(frames.at(-1).event.kind,'income');assert.equal(frames.at(-1).state.turn,initial.turn+1);assert.deepEqual(frames.at(-1).state,quickEndTurn(initial));assert.deepEqual(initial,original);
 // A rival also takes a neutral city once it meets the same threshold.
 const ai=frames[0].event.actor,neutralIndex=initial.regions.findIndex(r=>r.id===frames[0].event.regionId);
 assert.ok(neutralIndex>=12,'Rivals pursue the free island cities');
 const rivalReady=structuredClone(initial);rivalReady.regions[neutralIndex].influence[ai]=54;
 const taken=planQuickEndTurn(rivalReady)[0];assert.equal(taken.state.regions[neutralIndex].infoController,ai);
 const shielded=structuredClone(initial);shielded.regions[neutralIndex].factCheckShield[player]=1;const blocked=planQuickEndTurn(shielded)[0];assert.equal(blocked.event.kind,'blocked');assert.equal(blocked.event.amount,0);assert.equal(blocked.state.regions[neutralIndex].influence[ai],shielded.regions[neutralIndex].influence[ai]);
 const exhausted=structuredClone(initial);exhausted.result='loss';assert.equal(planQuickEndTurn(exhausted).length,0);assert.equal(quickEndTurn(exhausted),exhausted);
}
CITY_SITES.slice(12).forEach(p=>assert.ok(isNeutralLand(p.x,p.y),'Every grey island has a pickable city on its own contour'));
for(const [name,count] of [['atlas',8],['meridian',7],['concordat',8],['neutral',4]]){
 const svg=readFileSync(`public/continent-${name}.svg`,'utf8');assert.equal((svg.match(/<path d="M/g)??[]).length,1+count*2,'Opening fragment uses whole shorelines, including the surface grid');
 assert.ok(!svg.includes('<image'),'A fragment is a transparent silhouette, not a rectangular screenshot crop');
}
console.log('Turn playback checks passed: 16 cities, neutral thresholds and captures for every faction, rival captures, sequential immutable stages, shields, saved results and geographic opening fragments.');
