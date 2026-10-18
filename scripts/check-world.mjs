import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({entryPoints:['src/world/terrain.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {CITY_SITES,TERRITORIES,RIVERS,coastDistance,heightAt,nearestCity,terrainGeometry,roadPaths}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
assert.equal(CITY_SITES.length,16);
CITY_SITES.forEach((site,index)=>{
  assert.ok(coastDistance(site.x,site.y)>0,`City ${index} must be on land`);
  assert.ok(heightAt(site.x,site.y)>.5,`City ${index} must stand above the sea`);
  assert.equal(nearestCity(site.x,site.y),index,'Picking a city center must select that city');
  assert.ok(TERRITORIES[index].length>=3);
});
RIVERS.forEach((path,index)=>{
  for(let i=1;i<path.length;i++)assert.ok(path[i].bed<=path[i-1].bed+.001,`River ${index} must flow downhill`);
  assert.ok(path.at(-1).bed<0,'River mouth must meet the ocean');
});
const geometry=terrainGeometry();
for(const attribute of Object.values(geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value),'Geometry attributes must remain finite');
assert.ok(heightAt(37,23)<0,'Offshore terrain must be submerged');
const roads=roadPaths();assert.ok(roads.length>=11,'The mainland cities need local road segments');
roads.forEach(path=>path.forEach(p=>assert.ok(p.y>=heightAt(p.x,p.z),'Roads must not sink beneath the terrain')));
geometry.dispose();
console.log('World checks passed: 16 land-based cities, picking, downhill rivers, finite geometry and raised road network.');
