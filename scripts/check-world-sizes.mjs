import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:`export * from './src/game/quickGame';export * from './src/game/worlds';export * from './src/game/session';export {CITY_CLIMATES} from './src/game/realms';export * from './src/world/terrain';export {cityModel,batchStatic} from './src/world/scenery';export {createNewsrooms} from './src/world/newsrooms';export {createLivingMap} from './src/world/livingMap';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const g=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const values=new Map([['spheres.session.v6:old:standard','old-data']]);
const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
const actors=['atlas','meridian','concordat'];
for(const [difficulty,count,home,neutral,goal,limit] of [['discovery',10,3,1,6,16],['standard',16,4,4,10,24],['expert',22,6,4,14,36]]){
 for(const actor of actors){
  const state=g.createQuickGame('map-regression',actor,difficulty);
  assert.equal(state.regions.length,count);assert.equal(new Set(state.regions.map(r=>r.id)).size,count);
  assert.equal(g.objective(state).goal,goal);assert.equal(g.objective(state).limit,limit);
  for(const owner of actors)assert.equal(state.regions.filter(r=>r.politicalOwner===owner).length,home);
  assert.equal(state.regions.filter(r=>r.politicalOwner==='neutral').length,neutral);
  const sites=state.regions.map(r=>g.ALL_CITY_SITES[g.cityIndex(r)]),links=g.worldLinks(state);
  const reached=new Set([0]);for(let i=0;i<count;i++)for(const [a,b] of links){assert.ok(a>=0&&b<count&&a!==b);if(reached.has(a))reached.add(b);if(reached.has(b))reached.add(a);}
  assert.equal(reached.size,count,'Active media graph must be connected');
  state.regions.forEach((r,i)=>{
   assert.ok(g.regionTopic(r));assert.ok(g.regionRole(r));assert.ok(r.name);
   const site=sites[i],canonical=g.cityIndex(r);
   assert.equal(g.climateAt(site.x,site.y),g.CITY_CLIMATES[canonical]);
   assert.ok(g.coastDistance(site.x,site.y)>0);assert.ok(g.heightAt(site.x,site.y)>.5);
   assert.equal(g.nearestCity(site.x,site.y,sites),i);
   if(r.politicalOwner===actor)assert.ok(g.mediaReach(state).has(i));
   for(let j=0;j<i;j++)assert.ok(Math.hypot(site.x-sites[j].x,site.y-sites[j].y)>4);
  });
  const snapshot=JSON.stringify(state);g.quickEndTurn(state);assert.equal(JSON.stringify(state),snapshot,'Turn resolution must preserve input');
  const selected=state.regions.at(-1).id;assert.ok(g.saveSession(storage,state,selected));
  const restored=g.loadSession(storage,state.seed,difficulty);assert.deepEqual(restored.game,state);assert.equal(restored.selectedId,selected);
  const key=`spheres.session.v7:${state.seed}:${difficulty}`,valid=values.get(key);
  for(const corrupt of [v=>v.game.regions.pop(),v=>v.game.regions[0].id='missing-city',v=>v.rules='6']){const v=JSON.parse(valid);corrupt(v);values.set(key,JSON.stringify(v));assert.equal(g.loadSession(storage,state.seed,difficulty),null);}
  values.set(key,valid);
  if(actor!=='atlas')continue;
  for(const road of g.roadPaths(sites,state.regions.map(r=>r.politicalOwner)))for(const p of road)assert.ok(p.y>=g.heightAt(p.x,p.z));
  const groups=state.regions.map(r=>g.cityModel(r,g.cityIndex(r))),batched=g.batchStatic(groups);
  assert.ok(batched.children.length<40);batched.traverse(mesh=>{if(mesh.isMesh){assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));mesh.geometry.dispose();}});
  const news=g.createNewsrooms(false,sites);news.sync(state.regions,0);news.update(1);assert.equal(news.group.children[0].count,count*3);
  for(const mesh of news.group.children){assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}
  const live=g.createLivingMap(true,false,sites);live.update(20);assert.equal(live.group.children[0].count,count);
  for(const mesh of live.group.children){assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}
 }
}
assert.equal(values.get('spheres.session.v6:old:standard'),'old-data');assert.equal(g.loadSession(storage,'old'),null);
// An isolated controlled relay with a newsroom must reach a third-hop foreign city.
const relayState=g.createQuickGame('relay-regression','atlas','expert');
for(const r of relayState.regions){r.infoController=null;for(const actor of actors)r.mediaNodes[actor]=0;}
const relay=relayState.regions.find(r=>r.id==='atlas-relay');relay.infoController='atlas';
const before=g.mediaReach(relayState);relay.mediaNodes.atlas=1;const after=g.mediaReach(relayState);
const start=relayState.regions.indexOf(relay),distance=new Map([[start,0]]),links=g.worldLinks(relayState);
for(let hop=0;hop<3;hop++)for(const [a,b] of links){if(distance.get(a)===hop&&!distance.has(b))distance.set(b,hop+1);if(distance.get(b)===hop&&!distance.has(a))distance.set(a,hop+1);}
assert.ok([...distance].some(([i,d])=>d===3&&!before.has(i)&&after.has(i)),'Relay must open a third-hop audience');
console.log('World-size checks passed: nine ruler/map combinations, 10/16/22 cities, connected media graphs, stable climate/picking, isolated saves, immutable turns, three-hop relay and finite active-city models.');
