import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8'));
const entry=Object.values(manifest).find(item=>item.isEntry);assert.ok(entry,'Production entry must exist');
const initial=new Set();function visit(item){if(initial.has(item.file))return;initial.add(item.file);for(const dependency of item.imports??[])visit(manifest[dependency]);}visit(entry);
let bytes=0;for(const file of initial){assert.ok(existsSync('dist/'+file));bytes+=gzipSync(readFileSync('dist/'+file)).length;}
assert.ok(bytes<80*1024,`Initial JavaScript must remain under 80 KiB gzip; received ${bytes}`);
assert.ok(![...initial].some(file=>file.includes('three-engine')),'3D engine must stay out of the initial script graph');
for(const item of Object.values(manifest))assert.ok(existsSync('dist/'+item.file),`Missing asset ${item.file}`);
const html=readFileSync('dist/index.html','utf8');assert.ok(!html.includes('src="/assets/'),'Assets must work under a Pages project path');
for(const asset of ['app-icon.svg','manifest.webmanifest','sw.js','cinematics/intro-atlas.mp4','cinematics/intro-meridian.mp4','cinematics/intro-concordat.mp4','cinematics/intro-poster.jpg','cinematics/victory-atlas.mp4','cinematics/victory-meridian.mp4','cinematics/victory-concordat.mp4','cinematics/victory-atlas.jpg','cinematics/victory-meridian.jpg','cinematics/victory-concordat.jpg'])assert.ok(existsSync('dist/'+asset));
const application=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));assert.equal(application.orientation,'any');
for(const file of readdirSync('dist/assets'))if(file.endsWith('.js'))assert.ok(!readFileSync('dist/assets/'+file,'utf8').includes('[WorldScene] Rendering profile'),'Development telemetry must be absent from release');
console.log(`Release checks passed: ${(bytes/1000).toFixed(1)} kB initial JS gzip; lazy 3D engine; relative assets; public app metadata.`);

const music=JSON.parse(readFileSync('public/music/manifest.json','utf8'));assert.equal(music.length,8);for(const item of music){const file='dist/music/'+item.key+'.mp3';assert.ok(existsSync(file),'Missing production music '+item.key);assert.equal(readFileSync(file).length,item.bytes);}assert.ok(existsSync('dist/music/CREDITS.txt'));

assert.ok(![...initial].some(file=>file.includes('MusicPanel')),'Music settings must load on demand');
for(const row of JSON.parse(readFileSync('public/cinematics/mobile-sources.json','utf8')))assert.equal(readFileSync('dist/cinematics/'+row.file).length,row.bytes,'Mobile movie missing from release');

const cachedScreens=JSON.parse(readFileSync('dist/build-assets.json','utf8'));
for(const item of Object.values(manifest)){
 if(item.file.endsWith('.js'))assert.ok(cachedScreens.includes('./'+item.file),'Screen missing from update cache: '+item.file);
 for(const css of item.css??[])assert.ok(cachedScreens.includes('./'+css));
}
