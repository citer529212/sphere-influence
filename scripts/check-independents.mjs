import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:`export * from './src/game/quickGame';export * from './src/game/independents';export * from './src/game/session';export {FACTION_IDS} from './src/game/realms';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const g=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
assert.deepEqual(g.FACTION_IDS,['atlas','meridian','concordat']);
for(const [difficulty,count] of [['discovery',3],['standard',3],['expert',3]]){
 const s=g.createQuickGame('independent-turns','atlas',difficulty),before=structuredClone(s),frames=g.planQuickEndTurn(s),local=frames.filter(f=>f.event.kind==='independent');
 assert.equal(local.length,count);assert.deepEqual(s,before);assert.deepEqual(g.planQuickEndTurn(s),frames);assert.deepEqual(frames.at(-1).state,g.quickEndTurn(s));
 assert.equal(new Set(s.independents.flatMap(b=>b.cities)).size,s.regions.filter(r=>r.politicalOwner==='neutral').length);
 for(let i=0;i<local.length;i++){
  const frame=local[i];assert.equal(frame.event.actor,s.independents[i].id);assert.ok(g.actorIdentity(frame.event.actor).name);assert.ok(!g.isCrown(frame.event.actor));
  assert.equal(frame.state.independents[i].budget,4);for(let j=i+1;j<count;j++)assert.equal(frame.state.independents[j].budget,5,'Later neutral powers must not act early in a snapshot');
 }
 assert.equal(frames.at(-1).event.kind,'income');
 for(const r of frames.at(-1).state.regions)assert.equal(r.politicalOwner,s.regions.find(x=>x.id===r.id).politicalOwner);
}
for(const actor of g.FACTION_IDS)for(const id of g.INDEPENDENT_IDS){
 const s=g.createQuickGame('diplomacy',actor,'expert'),after=g.negotiateIndependent(s,id),b=after.independents.find(b=>b.id===id);
 assert.equal(s.actions,2);assert.equal(after.actions,1);assert.equal(after.influence,s.influence-4);assert.equal(b.pacts[actor],4);assert.equal(b.relations[actor],20);
 assert.strictEqual(g.negotiateIndependent(after,id),after);assert.ok(g.diplomacyError(after,id),'An active treaty must block repeated payment');
 const poor=structuredClone(s);poor.influence=3;assert.strictEqual(g.negotiateIndependent(poor,id),poor);
 const empty=structuredClone(s);empty.actions=0;assert.strictEqual(g.negotiateIndependent(empty,id),empty);
 const pending=structuredClone(s);pending.turn=4;assert.strictEqual(g.negotiateIndependent(pending,id),pending);
 const map=new Map([['spheres.session.v8:old:expert','retained']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert.ok(g.saveSession(storage,after,after.regions[0].id));assert.deepEqual(g.loadSession(storage,after.seed,'expert').game,after);assert.equal(map.get('spheres.session.v8:old:expert'),'retained');
 const key=`spheres.session.v10:${after.seed}:expert`,valid=map.get(key);
 for(const mutate of [v=>v.game.independents[0].budget=31,v=>v.game.independents[0].level=3,v=>v.game.independents[0].cities=['fake-city'],v=>v.game.independents[0].relations.atlas=76,v=>v.game.independents[0].id='__proto__',v=>v.game.independents[0].pacts.atlas=99,v=>v.game.independents[0].lastContact.atlas=35]){const v=JSON.parse(valid);mutate(v);map.set(key,JSON.stringify(v));assert.equal(g.loadSession(storage,after.seed,'expert'),null);}
}
let s=g.createQuickGame('radio','atlas','expert');const oldReach=g.mediaReach(s);s=g.negotiateIndependent(s,'radio');assert.ok(g.mediaReach(s).size>oldReach.size);s.turn=5;assert.deepEqual(g.mediaReach(s),oldReach);
s=g.createQuickGame('platforms');s=g.negotiateIndependent(s,'platforms');assert.equal(g.independentIncome(s,'atlas'),1);s.turn=3;g.advanceIndependents(s,g.regionController);assert.equal(s.independents.find(b=>b.id==='platforms').level,1);assert.equal(g.independentIncome(s,'atlas'),2);s.turn=5;assert.equal(g.independentIncome(s,'atlas'),0);
const localSetup=id=>{const s=g.createQuickGame('neutral-counterplay');const b=s.independents.find(b=>b.id===id),r=s.regions.find(r=>r.id===b.cities[0]);r.influence={atlas:70,meridian:10,concordat:0};r.infoController='atlas';return {s,b,r};};
let {s:a,r}=localSetup('archives');a.trust=30;g.advanceIndependents(a,g.regionController);assert.equal(r.influence.atlas,66);
({s:a,r}=localSetup('archives'));a.trust=30;r.factCheckShield.atlas=1;const events=g.advanceIndependents(a,g.regionController);assert.equal(r.influence.atlas,70);assert.equal(r.factCheckShield.atlas,0);assert.ok(events.find(e=>e.actor==='archives').text.includes('заблокировала'));
({s:a,r}=localSetup('radio'));g.advanceIndependents(a,g.regionController);assert.equal(r.influence.concordat,3);
const funds=g.createQuickGame('neutral-economy');for(const b of funds.independents)b.budget=0;const savedFunds=structuredClone(funds);const saving=g.advanceIndependents(funds,g.regionController);assert.ok(saving.every(e=>e.text.includes('Накапливает')));assert.ok(funds.independents.every(b=>b.budget===3));assert.deepEqual(funds.regions,savedFunds.regions,'A power without funds must not apply its normal effect');
console.log('Independent powers passed: three autonomous policies, sequential snapshots, budgets, diplomacy costs/cooldown, symmetry for three crowns, non-exclusive timed pacts, trade development, radio reach/expiry, investigations and shields, immutable plans, validated saves and retained v8 data.');
