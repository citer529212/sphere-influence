import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/world/opinion';export {createQuickGame,regionController,supportNeeded} from './src/game/quickGame';export {terrainGeometry} from './src/world/terrain';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {opinion,createOpinionTint,createQuickGame,regionController,supportNeeded,terrainGeometry}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const game=createQuickGame('opinion-map');
for(const owner of ['neutral','atlas'])for(const scores of [[0,0,0],[20,18,0],[35,35,10],[40,36,0],[40,35,0],[55,40,10],[100,100,100]])for(const player of ['atlas','meridian','concordat']){
 const r={...game.regions[0],politicalOwner:owner,influence:{atlas:scores[0],meridian:scores[1],concordat:scores[2]}};
 const view=opinion(r,player);assert.equal(view.controller,regionController(r));assert.equal(view.needed,supportNeeded(r,player));assert.equal(view.support,r.influence[player]);assert.equal(view.fragile,view.controller!=='contested'&&view.margin<15);
 if(view.needed>0){const changed=structuredClone(r);changed.influence[player]+=view.needed;assert.equal(regionController(changed),player,'Displayed gap must reach actual leadership threshold');}
}
const geometry=terrainGeometry(),positions=geometry.attributes.position,base=Array.from(geometry.attributes.color.array),before=JSON.stringify(game.regions),tint=createOpinionTint(geometry);
tint.update(game.regions,true);const colored=Array.from(geometry.attributes.color.array);assert.notDeepEqual(colored,base);assert.ok(colored.every(Number.isFinite));
for(let i=0;i<positions.count;i++)if(positions.getY(i)<=.16)assert.deepEqual(colored.slice(i*3,i*3+3),base.slice(i*3,i*3+3),'Water and shore must retain base colors');
tint.update(game.regions,false);assert.deepEqual(Array.from(geometry.attributes.color.array),base,'Political mode must restore all original climate colors');tint.update(game.regions,true);assert.deepEqual(Array.from(geometry.attributes.color.array),colored,'Repeated switches must not accumulate tint');assert.equal(JSON.stringify(game.regions),before,'Map presentation must not mutate game rules');geometry.dispose();
console.log('Opinion checks passed: ties, neutral threshold, all factions, exact leadership gap, water colors, reversible tint and immutable state.');
