import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';

// A classic, non-splitting bundle also runs under file:// without module fetches.
const continents=Object.fromEntries(await Promise.all(['atlas','meridian','concordat','neutral'].map(async id=>[id,'data:image/svg+xml;base64,'+Buffer.from(await readFile(`public/continent-${id}.svg`)).toString('base64')])));
const result=await build({entryPoints:['src/main.tsx'],bundle:true,splitting:false,format:'iife',platform:'browser',target:['es2022'],minify:true,write:false,metafile:true,outfile:'offline.js',define:{'process.env.NODE_ENV':'"production"','import.meta.env.DEV':'false','import.meta.env.PROD':'false'},plugins:[{name:'offline-assets',setup(b){
 b.onLoad({filter:/[/\\]Chronicle\.tsx$/},async args=>{let contents=await readFile(args.path,'utf8');const marker='src={`./continent-${f}.svg`}';assert.ok(contents.includes(marker),'Opening asset reference changed');contents=contents.replace(marker,'src={OFFLINE_CONTINENTS[f]}');return {contents:`const OFFLINE_CONTINENTS=${JSON.stringify(continents)};\n`+contents,loader:'tsx',resolveDir:path.dirname(args.path)};});
 b.onLoad({filter:/[/\\]mobileCinematicAssets\.ts$/},()=>({contents:"export { INTRO_MOVIES as MOBILE_INTRO_MOVIES, VICTORY_MOVIES as MOBILE_VICTORY_MOVIES } from './cinematicAssets';",loader:'ts',resolveDir:path.resolve('src/ui')}));
 b.onLoad({filter:/[/\\]musicAssets\.ts$/},async args=>{let contents=await readFile(args.path,'utf8');const paths=[...contents.matchAll(/(['"])\.\/music\/([^'"]+)\1/g)];assert.equal(paths.length,8,'All eight music recordings must be embedded');for(const match of paths){const name=match[2];assert.ok(!name.includes('/')&&!name.includes('..'));const data='data:audio/mpeg;base64,'+Buffer.from(await readFile('public/music/'+name)).toString('base64');contents=contents.replace(match[0],JSON.stringify(data));}return {contents,loader:'ts',resolveDir:path.dirname(args.path)};});
 b.onLoad({filter:/[/\\]cinematicAssets\.ts$/},async args=>{let contents=await readFile(args.path,'utf8');const paths=[...contents.matchAll(/(['"])\.\/cinematics\/([^'"]+)\1/g)];assert.equal(paths.length,10,'Opening and victory movies and posters must be embedded');for(const match of paths){const name=match[2];assert.ok(!name.includes('/')&&!name.includes('..'));const mime=name.endsWith('.mp4')?'video/mp4':'image/jpeg',data='data:'+mime+';base64,'+Buffer.from(await readFile('public/cinematics/'+name)).toString('base64');contents=contents.replace(match[0],JSON.stringify(data));}return {contents,loader:'ts',resolveDir:path.dirname(args.path)};});
 b.onLoad({filter:/[/\\]challenge\.ts$/},async args=>{let contents=await readFile(args.path,'utf8');contents=contents.replace("const {hostname}=new URL(address);", "if(new URL(address).protocol==='file:')return true;const {hostname}=new URL(address);");return {contents,loader:'ts',resolveDir:path.dirname(args.path)};});
} }]});
const js=result.outputFiles.find(f=>f.path.endsWith('.js'))?.text,css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text;
assert.ok(js&&css);assert.ok(!css.match(/url\(\s*['"]?(?!data:|#)/),'Offline CSS must not request external assets');
new Script(js,{filename:'sphere-influence-offline.js'});
assert.ok(Object.values(result.metafile.outputs).every(o=>o.imports.length===0),'No external imports or chunks');
assert.ok(!js.includes('./continent-'),'Opening SVGs must be embedded');
assert.ok(!js.includes('./cinematics/'),'Opening movies and poster must be embedded');
assert.ok(!js.includes('./music/'),'All music must be embedded');
assert.equal((js.match(/data:audio\/mpeg;base64,/g)??[]).length,8,'Eight offline music assets required');
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>Сферы влияния — автономная игра</title><style>${css.replace(/<\/style/gi,'<\\/style')}</style></head><body><div id="root"></div><noscript>Для запуска игры включите JavaScript в браузере.</noscript><script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
assert.ok(!/<(?:script|link)\b[^>]*(?:src|href)\s*=/.test(html),'All scripts and styles must be embedded');
await mkdir('offline',{recursive:true});
const filename='offline/sphere-influence-offline.html';await writeFile(filename,html);
console.log(`${filename}: ${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MiB; embedded engine, map, CSS, three opening movies, three victory movies, eight music tracks, credits, posters and fallback fragments; no server or service worker.`);
