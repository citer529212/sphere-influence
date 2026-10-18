import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function bundle(path){const output=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);}
const {saveSession,loadSession,startSession,savePreferences,loadPreferences}=await bundle('src/game/session.ts');
const {createQuickGame,quickAction,quickEndTurn}=await bundle('src/game/quickGame.ts');
const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
let game=createQuickGame('2026-10-17');game=quickAction(game,game.regions[0].id,'media');game=quickEndTurn(game);
assert.ok(saveSession(storage,game,game.regions[4].id));
const loaded=loadSession(storage,game.seed);assert.deepEqual(loaded.game,game);assert.equal(loaded.selectedId,game.regions[4].id);
assert.equal(startSession(storage,undefined,'2026-10-18').session.game.seed,'2026-10-17','An unfinished game survives a change of date');
const today=startSession(storage,'2026-10-18','2026-10-18');assert.equal(today.restored,false);assert.equal(today.session.game.seed,'2026-10-18');
saveSession(storage,today.session.game,today.session.selectedId);assert.equal(loadSession(storage,'2026-10-17').game.turn,2,'Maps keep independent saves');
savePreferences(storage,{sound:false,tutorialStep:2});assert.deepEqual(loadPreferences(storage),{sound:false,tutorialStep:2});
const key='spheres.session.v3:2026-10-17';const valid=values.get(key);
for(const mutate of [v=>v.version=99,v=>v.game.actions=8,v=>v.game.regions[0].influence.atlas=-1,v=>v.game.regions[0].infoController='meridian',v=>v.game.regions.pop(),v=>v.game.result='win']){
 const bad=JSON.parse(valid);mutate(bad);values.set(key,JSON.stringify(bad));assert.equal(loadSession(storage,'2026-10-17'),null,'Invalid saves must be rejected');
}
values.set(key,'broken json');assert.equal(loadSession(storage,'2026-10-17'),null);
values.set(key,valid);const canonical=JSON.parse(valid);canonical.game.regions[0].name='Changed by stored data';values.set(key,JSON.stringify(canonical));assert.equal(loadSession(storage,'2026-10-17').game.regions[0].name,game.regions[0].name,'Static scenario data comes from the game');
assert.equal(saveSession(null,game,game.regions[0].id),false);assert.equal(loadSession(null,game.seed),null);
const blocked={getItem(){throw new Error('Blocked');},setItem(){throw new Error('Full');}};
assert.equal(saveSession(blocked,game,game.regions[0].id),false);assert.equal(startSession(blocked,undefined,'2026-10-18').session.game.seed,'2026-10-18');
console.log('Session checks passed: round-trip, selected city, date rollover, independent maps, preferences, malformed saves and unavailable storage.');
