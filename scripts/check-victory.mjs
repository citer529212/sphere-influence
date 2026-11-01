import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {boxes,child,duration} from './mp4-atoms.mjs';
const bundle=await build({stdin:{contents:"export * from './src/game/victory';export * from './src/ui/cinematicAssets';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {victoryMovieKey,shouldShowVictory,VICTORY_MOVIES,VICTORY_POSTERS}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const manifests=JSON.parse(readFileSync('public/cinematics/victory-sources.json','utf8'));assert.equal(manifests.length,3);assert.equal(new Set(Object.values(VICTORY_MOVIES)).size,3);
for(const player of ['atlas','meridian','concordat']){
 const state={seed:'win-check',player,difficulty:'standard',turn:13,result:'win'},before=structuredClone(state),key=victoryMovieKey(state);
 assert.ok(shouldShowVictory(state,true,false,false,null));assert.ok(!shouldShowVictory(state,true,false,false,key));assert.ok(!shouldShowVictory(state,false,false,false,null));assert.ok(!shouldShowVictory(state,true,true,false,null));assert.ok(!shouldShowVictory(state,true,false,true,null));
 for(const result of [null,'loss']){assert.equal(victoryMovieKey({...state,result}),null);assert.ok(!shouldShowVictory({...state,result},true,false,false,null));}assert.notEqual(victoryMovieKey({...state,seed:'another-map'}),key);assert.deepEqual(state,before);
 const path=VICTORY_MOVIES[player];assert.ok(path.endsWith(`victory-${player}.mp4`));const data=readFileSync('public/'+path.slice(2)),top=boxes(data),moov=top.find(b=>b.type==='moov'),mdat=top.find(b=>b.type==='mdat');assert.ok(moov&&mdat&&moov.start<mdat.start);const length=duration(data,child(data,moov,'mvhd'));assert.ok(length>=5&&length<5.2,'Victory clip duration must match the supplied five-second video');
 const tracks=boxes(data,moov.body,moov.end).filter(b=>b.type==='trak');assert.equal(tracks.length,1,'Silent originals must stay silent');const mdia=child(data,tracks[0],'mdia'),hdlr=child(data,mdia,'hdlr');assert.equal(data.toString('ascii',hdlr.body+8,hdlr.body+12),'vide');const stsd=child(data,child(data,child(data,mdia,'minf'),'stbl'),'stsd'),entry=boxes(data,stsd.body+8,stsd.end)[0];assert.equal(entry.type,'avc1');assert.equal(data.readUInt16BE(entry.body+24),1280);assert.equal(data.readUInt16BE(entry.body+26),720);assert.ok(data.length<5*1024*1024);
 assert.equal(readFileSync('public/'+VICTORY_POSTERS[player].slice(2)).readUInt16BE(0),0xffd8);assert.equal(manifests.find(m=>m.realm===player).audio,false);
}
console.log('Victory checks passed: correct ruler clips, wins only, post-turn gating, skip/reopen suppression, loss exclusion, valid silent 720p H.264 fast-start movies and posters.');
