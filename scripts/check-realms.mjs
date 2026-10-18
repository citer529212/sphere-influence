import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const {createQuickGame,quickAction,quickEndTurn,controlled,actionCost,campaignGain,supportLead}=await load('src/game/quickGame.ts');
const {saveSession,loadSession}=await load('src/game/session.ts');
const {climateEffect,CITY_CLIMATES}=await load('src/game/realms.ts');
const {CITY_SITES,climateAt,coastDistance}=await load('src/world/terrain.ts');
const {MAP_LANDS}=await load('src/world/mapContours.ts');
const {challengeUrl,parseSharedChallenge,compareChallenge}=await load('src/game/challenge.ts');
assert.equal(MAP_LANDS.length,27);assert.equal(MAP_LANDS.filter(p=>p.faction==='neutral').length,4);
CITY_SITES.forEach((p,i)=>assert.equal(climateAt(p.x,p.y),CITY_CLIMATES[i],`Climate UI matches land at city ${i}`));
assert.ok(coastDistance(-2,0)<0,'Strait between the grey islands and red continent is water');
for(const player of ['atlas','meridian','concordat']){
 let game=createQuickGame('three-crowns-test',player);assert.equal(controlled(game),4);
 const home=game.regions.find(r=>r.infoController===player),other=game.regions.find(r=>r.infoController!==player);
 assert.equal(actionCost(game,'media'),player==='atlas'?4:5);
 const shield=quickAction(game,other.id,'protect');assert.equal(shield.regions.find(r=>r.id===other.id).influence[player],18+(player==='meridian'?15:10));
 const attracted=quickAction(game,other.id,'attract');assert.equal(attracted.trust,player==='concordat'?56:57);
 assert.equal(attracted.regions.find(r=>r.id===other.id).fatigue,player==='atlas'?14:10);
 assert.equal(quickEndTurn(game).influence,12+(player==='concordat'?5:4));
 const storage=new Map(),adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 saveSession(adapter,shield,other.id);assert.deepEqual(loadSession(adapter,game.seed).game,shield,'Selected faction, shields and stats survive reload');
 const parsed=parseSharedChallenge(new URL(challengeUrl('https://example.com/',game)).search);assert.equal(parsed.player,player);
 game=quickAction(game,home.id,'media');game=quickAction(game,game.regions.find(r=>r.infoController===player&&r.id!==home.id).id,'media');game=quickEndTurn(game);
 while(!game.result){for(let i=0;i<2&&!game.result;i++){const target=game.regions.filter(r=>r.infoController!==player).sort((a,b)=>(supportLead(a,player)-a.influence[player])-(supportLead(b,player)-b.influence[player]))[0];if(target)game=quickAction(game,target.id,'attract');}if(!game.result)game=quickEndTurn(game);}
 assert.equal(game.result,'win',`${player} has a viable victory path`);
 console.log(`${player}: victory turn ${game.turn}`);
 assert.match(compareChallenge(game,{seed:game.seed,turns:game.turn,trust:game.trust,player:player==='atlas'?'meridian':'atlas'}),/другую державу/);
}
assert.equal(climateEffect(7,0),-3,'Polar winter reduces campaign support');assert.equal(climateEffect(3,3),-3,'Arid summer reduces campaign support');assert.equal(climateEffect(5,10),-2,'Tropical monsoon reduces campaign support');
const a=createQuickGame('climate');assert.equal(campaignGain({...a,turn:7},a.regions[0]),campaignGain({...a,turn:3},a.regions[0])-3);
console.log('Three crowns checks passed: map provenance, grey islands, biome consistency, all playable factions, perks, drawbacks, saves, challenge faction and seasons.');
