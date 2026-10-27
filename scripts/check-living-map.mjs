import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/world/livingMap';export {heightAt,coastDistance,CITY_SITES} from './src/world/terrain';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {seaRoutes,createLivingMap,influencePulse,heightAt,coastDistance,CITY_SITES}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const paths=seaRoutes();assert.equal(paths.length,3,'All three realms need ocean routes');
for(const path of paths)for(let i=1;i<path.length;i++)for(let k=0;k<=20;k++){const t=k/20,x=path[i-1].x+(path[i].x-path[i-1].x)*t,z=path[i-1].z+(path[i].z-path[i-1].z)*t;assert.ok(coastDistance(x,z)<-.65,'Ship routes must avoid mainland and neutral islands');}
function snapshot(group){return group.children.map(mesh=>Array.from(mesh.instanceMatrix.array));}
function dispose(group){for(const mesh of group.children){mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}}
for(const economy of [true,false]){
 const live=createLivingMap(economy,false);assert.equal(live.group.children.length,3,'Ambient detail must use three instanced draw calls');
 const length=paths[0].slice(1).reduce((sum,p,i)=>sum+p.distanceTo(paths[0][i]),0),arrival=length/.65;live.update(arrival-.1);const hullBefore=Array.from(live.group.children[1].instanceMatrix.array).slice(12,15);live.update(arrival+.1);const hullAfter=Array.from(live.group.children[1].instanceMatrix.array).slice(12,15);assert.ok(Math.hypot(...hullBefore.map((x,i)=>x-hullAfter[i]))<.2,'Vessels must turn at ports without teleporting');
 const before=snapshot(live.group);for(const t of [0,1,17,1000]){live.update(t);for(const matrix of snapshot(live.group))assert.ok(matrix.every(Number.isFinite));}assert.notDeepEqual(snapshot(live.group),before,'Smoke and vessels must move');dispose(live.group);
 const still=createLivingMap(economy,true),first=snapshot(still.group);still.update(97);assert.deepEqual(snapshot(still.group),first,'Reduced motion must freeze ambient movement');dispose(still.group);
}
for(const site of CITY_SITES){const wave=influencePulse(site.x,site.y),positions=wave.geometry.attributes.position;for(let i=0;i<positions.count;i++){assert.ok(Number.isFinite(positions.getY(i)));assert.ok(positions.getY(i)>=heightAt(site.x+positions.getX(i),site.y+positions.getZ(i))+.16,'Pulse vertices must follow the terrain above its surface');}wave.geometry.dispose();wave.material.dispose();}
console.log('Living map checks passed: three sea routes avoid land, instancing budget, finite transforms, reduced motion, terrain-following pulses.');
