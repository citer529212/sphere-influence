import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({stdin:{contents:`export * from './src/game/quickGame';export * from './src/game/characters';export * from './src/game/session';export {FACTION_IDS} from './src/game/realms';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const g=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
assert.deepEqual(g.FACTION_IDS,['atlas','meridian','concordat']);assert.equal(Object.keys(g.CHARACTERS).length,3);
for(const actor of g.FACTION_IDS){
 let s=g.createQuickGame('story-contracts',actor,'expert');s.turn=4;
 const before=structuredClone(s),event=g.pendingWorldEvent(s);assert.equal(event.npc,'courier');
 const oldReach=g.mediaReach(s),target=s.regions.findIndex(r=>r.id===event.region.id);assert.ok(!oldReach.has(target));
 let after=g.resolveWorldEvent(s,'verify');assert.deepEqual(s,before);assert.ok(g.mediaReach(after).has(target));assert.equal(after.accords[actor].expires,6);assert.equal(after.actions,s.actions);
 assert.strictEqual(g.resolveWorldEvent(after,'verify'),after,'An NPC cannot be farmed by reopening its dialog');
 after.turn=7;assert.ok(!g.mediaReach(after).has(target),'Temporary courier reach must expire');
 const entries=new Map([['spheres.session.v7:old:expert','old-data']]),store={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};
 after=g.resolveWorldEvent(s,'verify');assert.ok(g.saveSession(store,after,after.regions[0].id));assert.deepEqual(g.loadSession(store,after.seed,'expert').game,after);assert.equal(entries.get('spheres.session.v7:old:expert'),'old-data');
 const key=`spheres.session.v10:${after.seed}:expert`,valid=entries.get(key);
 for(const corrupt of [v=>v.game.accords[actor].npc='__proto__',v=>v.game.accords[actor].regionId='missing',v=>v.game.accords[actor].expires=99]){const v=JSON.parse(valid);corrupt(v);entries.set(key,JSON.stringify(v));assert.equal(g.loadSession(store,after.seed,'expert'),null);}
 s=g.createQuickGame('archive-contract',actor);s.turn=8;s.eventTurn=4;const r=s.regions[0];s.campaigns[`${actor}:${r.id}`]={topic:s.topic,repeats:2};assert.equal(g.repeatPenalty(s,r,s.topic),16);
 after=g.resolveWorldEvent(s,'verify');assert.equal(after.accords[actor].npc,'archivist');assert.equal(g.repeatPenalty(after,after.regions[0],s.topic),0);after.turn=11;assert.equal(g.repeatPenalty(after,after.regions[0],s.topic),16);
 s=g.createQuickGame('editor-contract',actor);s.turn=12;s.eventTurn=8;after=g.resolveWorldEvent(s,'verify');assert.equal(after.accords[actor].npc,'editor');for(const city of after.regions)if(city.infoController===actor)assert.equal(city.factCheckShield[actor],1);
 const declined=g.resolveWorldEvent(s,'listen');assert.deepEqual(declined.accords,{});assert.equal(declined.influence,s.influence);
}
console.log('Story checks passed: only three playable rulers, three NPCs, reachable remote city, expiry, archive repeat suppression/expiry, city shields, once-only choices, free refusal, immutable state and validated v10 contract saves with v7 retained.');
