import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {boxes,child,duration} from './mp4-atoms.mjs';
const bundle=await build({entryPoints:['src/ui/cinematicAssets.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {INTRO_MOVIES,INTRO_POSTER,openingChapter}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const manifest=JSON.parse(readFileSync('public/cinematics/source-manifest.json','utf8'));assert.equal(manifest.sources.length,5);assert.equal(new Set(Object.values(INTRO_MOVIES)).size,3,'Rulers need distinct opening movies');
for(const realm of ['atlas','meridian','concordat']){
 const url=INTRO_MOVIES[realm];assert.ok(url.endsWith(`intro-${realm}.mp4`));const data=readFileSync('public/'+url.slice(2)),top=boxes(data),moov=top.find(b=>b.type==='moov'),mdat=top.find(b=>b.type==='mdat');assert.ok(moov&&mdat&&moov.start<mdat.start,'Fast-start metadata must precede video data');
 const length=duration(data,child(data,moov,'mvhd'));assert.ok(length>20.5&&length<21,'Opening must include both shared scenes and the selected realm');
 const tracks=boxes(data,moov.body,moov.end).filter(b=>b.type==='trak').map(trak=>{const mdia=child(data,trak,'mdia'),handler=child(data,mdia,'hdlr'),stsd=child(data,child(data,child(data,mdia,'minf'),'stbl'),'stsd'),entry=boxes(data,stsd.body+8,stsd.end)[0];return {kind:data.toString('ascii',handler.body+8,handler.body+12),entry,duration:duration(data,child(data,mdia,'mdhd'))};});
 const video=tracks.find(t=>t.kind==='vide'),audio=tracks.find(t=>t.kind==='soun');assert.ok(video&&audio);assert.equal(video.entry.type,'avc1');assert.equal(audio.entry.type,'mp4a');assert.equal(data.readUInt16BE(video.entry.body+24),1280);assert.equal(data.readUInt16BE(video.entry.body+26),720);assert.ok(Math.abs(video.duration-audio.duration)<.15,'Audio/video durations must stay aligned');assert.ok(data.length<20*1024*1024,'Each opening must remain under 20 MB');
}
assert.equal(readFileSync('public/'+INTRO_POSTER.slice(2)).readUInt16BE(0),0xffd8);assert.equal(openingChapter(0),0);assert.equal(openingChapter(manifest.chapters[1]+.001),1);assert.equal(openingChapter(manifest.chapters[2]+.001),2);
console.log('Cinematic checks passed: three distinct ruler edits, 21-second story, H.264/AAC 720p, synchronized audio, fast-start MP4 atoms, poster and chapter order.');
