import {assembleMobileVideos,checkedVideo} from './assemble-mobile-videos.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
await assembleMobileVideos();
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {boxes,child,duration} from './mp4-atoms.mjs';
const bundled=await build({stdin:{contents:"export * from './src/device';export * from './src/world/viewport';export {PerspectiveCamera,Vector3} from 'three';export * from './src/world/frameBudget';export * from './src/world/tapGesture';export * from './src/world/terrain';export * from './src/world/water';export * from './src/world/scenery';export * from './src/game/quickGame';export * from './src/game/worlds';export * from './src/ui/mobileCinematicAssets';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const g=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
for(const [width,height] of [[320,568],[390,844],[430,932],[844,390],[932,430],[1024,1366]]){
 const profile=g.renderProfile({width,height,coarse:true,pixelRatio:3});assert.equal(profile.economy,true);assert.equal(profile.shadows,false);assert.equal(profile.fps,30);assert.equal(profile.pixelRatio,1);
}
const desktop=g.renderProfile({width:1440,height:900,coarse:false,pixelRatio:2});assert.equal(desktop.shadows,true);assert.equal(desktop.fps,60);assert.equal(desktop.pixelRatio,1.5);
assert.ok(g.renderProfile({width:1440,height:900,coarse:false,pixelRatio:1,memory:2}).economy);
assert.ok(g.renderProfile({width:1440,height:900,coarse:false,pixelRatio:1,saveData:true}).economy);
for(const fps of [30,60]){
 for(const refresh of [60,90,120]){
  const clock=new g.FrameBudget(fps);let frames=0,seconds=0;
  for(let i=0;i<=refresh*10;i++){const dt=clock.take(i*1000/refresh);if(dt!==null){frames++;seconds+=dt;}}
  assert.ok(frames<=fps*10+2);assert.ok(frames>=fps*10*.7);assert.ok(Math.abs(seconds-10)<.1,'Throttling must preserve animation speed');
  clock.reset();assert.equal(clock.take(300000),0,'Resuming must not fast-forward hidden time');
 }
}
const tap=new g.TapGesture(),p=(pointerId,x=10,y=10,pointerType='touch')=>({pointerId,clientX:x,clientY:y,pointerType});
tap.begin(p(1));assert.ok(tap.end(p(1,15,14)));
tap.begin(p(1));tap.move(p(1,60));tap.move(p(1));assert.equal(tap.end(p(1)),false,'A drag returning to start must not select');
tap.begin(p(1));tap.begin(p(2));assert.equal(tap.end(p(2)),false);assert.equal(tap.end(p(1)),false,'Pinch release must not select');
tap.begin(p(1));tap.cancel(p(1));assert.equal(tap.end(p(1)),false);tap.begin(p(2));assert.ok(tap.end(p(2)));
tap.begin(p(1));tap.clear();assert.equal(tap.active,false);assert.equal(tap.end(p(1)),false);
const profile=g.renderProfile({width:390,height:844,coarse:true,pixelRatio:3}),full=g.terrainGeometry(),mobile=g.terrainGeometry(...profile.terrainSegments);
const triangles=geo=>geo.index.count/3;assert.ok(triangles(mobile)<triangles(full)*.45);
for(const attr of Object.values(mobile.attributes))assert.ok([...attr.array].every(Number.isFinite));
const water=g.createWater(),waterMobile=g.createWater(true);assert.ok(triangles(waterMobile.geometry)<triangles(water.geometry)*.1);assert.equal(waterMobile.material.defines.LOW_POWER,1);assert.equal(waterMobile.material.uniforms.shore.value.image.width,96);
const state=g.createQuickGame('mobile-cities','atlas','expert');let fullCities=0,mobileCities=0;
for(const r of state.regions){
 const a=g.cityModel(r,g.cityIndex(r)),b=g.cityModel(r,g.cityIndex(r),true);
 for(const [group,isMobile] of [[a,false],[b,true]])group.traverse(o=>{if(o.isMesh){const count=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;if(isMobile)mobileCities+=count;else fullCities+=count;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});
}
assert.ok(mobileCities<fullCities*.85,'Mobile cities must reduce geometry without dropping cities');
const records=JSON.parse(readFileSync('public/cinematics/mobile-sources.json','utf8'));assert.equal(records.length,6);
for(const faction of ['atlas','meridian','concordat'])for(const [variant,paths] of [['intro',g.MOBILE_INTRO_MOVIES],['victory',g.MOBILE_VICTORY_MOVIES]]){
 const file='public/'+paths[faction].slice(2),data=readFileSync(file),list=boxes(data),moov=list.find(b=>b.type==='moov'),mdat=list.find(b=>b.type==='mdat');assert.ok(moov.start<mdat.start);
 const actual=duration(data,child(data,moov,'mvhd'));assert.ok(variant==='intro'?actual>20.5&&actual<21:actual>=5&&actual<5.2);
 const tracks=boxes(data,moov.body,moov.end).filter(b=>b.type==='trak').map(trak=>{const mdia=child(data,trak,'mdia'),handler=child(data,mdia,'hdlr');return {kind:data.toString('ascii',handler.body+8,handler.body+12),mdia};});
 const v=tracks.find(t=>t.kind==='vide'),stsd=child(data,child(data,child(data,v.mdia,'minf'),'stbl'),'stsd'),entry=boxes(data,stsd.body+8,stsd.end)[0];assert.equal(entry.type,'avc1');assert.equal(data.readUInt16BE(entry.body+24),854);assert.equal(data.readUInt16BE(entry.body+26),480);assert.equal(tracks.some(t=>t.kind==='soun'),variant==='intro');
 const record=records.find(r=>r.file===paths[faction].split('/').at(-1));assert.equal(data.length,record.bytes);assert.ok(record.bytes<record.originalBytes*.4);
}
for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
 const pose=g.overviewPose(width,height),camera=new g.PerspectiveCamera(39,width/height,.1,600);camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(0,.5,0);camera.updateMatrixWorld();
 assert.ok(camera.position.distanceTo(new g.Vector3(0,.5,0))<pose.maxDistance);
 for(const site of g.ALL_CITY_SITES){const point=new g.Vector3(site.x,g.heightAt(site.x,site.y),site.y).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,'Overview must fit all city sites on the phone');}
}
const report={terrain:{desktopTriangles:triangles(full),mobileTriangles:triangles(mobile)},water:{desktopTriangles:triangles(water.geometry),mobileTriangles:triangles(waterMobile.geometry)},cities:{desktopTriangles:fullCities,mobileTriangles:mobileCities},video:{originalBytes:records.reduce((s,r)=>s+r.originalBytes,0),mobileBytes:records.reduce((s,r)=>s+r.bytes,0)}};
for(const geo of [full,mobile,water.geometry,waterMobile.geometry])geo.dispose();water.material.uniforms.shore.value.dispose();waterMobile.material.uniforms.shore.value.dispose();water.material.dispose();waterMobile.material.dispose();
console.log('Mobile checks passed: portrait/landscape profiles, 30 Hz budget, pause clock, tap/drag/pinch/cancel, finite reduced terrain and city geometry, lower-cost water, six 480p fast-start clips with original duration/audio layout.');
console.log(JSON.stringify(report));

const scratch=await mkdtemp(path.join(tmpdir(),'sphere-mobile-verify-'));
try{const first=await assembleMobileVideos({outputDir:scratch});assert.equal(first.files,6);assert.equal(first.written,6);const second=await assembleMobileVideos({outputDir:scratch});assert.equal(second.written,0);const records=JSON.parse(readFileSync('media/mobile/manifest.json','utf8'));for(const r of records)assert.deepEqual(readFileSync(path.join(scratch,r.file)),readFileSync('public/cinematics/'+r.file));assert.throws(()=>checkedVideo([Buffer.from('corrupted')],records[0]),/integrity mismatch/);}finally{await rm(scratch,{recursive:true,force:true});}
console.log('Mobile assembly passed: fresh reconstruction of six videos, exact bytes, cached outputs and corrupt-part rejection.');
