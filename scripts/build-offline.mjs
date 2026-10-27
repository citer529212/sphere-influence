import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';

// A classic, non-splitting bundle also runs under file:// without module fetches.
const continents=Object.fromEntries(await Promise.all(['atlas','meridian','concordat','neutral'].map(async id=>[id,'data:image/svg+xml;base64,'+Buffer.from(await readFile(`public/continent-${id}.svg`)).toString('base64')])));
const result=await build({entryPoints:['src/main.tsx'],bundle:true,splitting:false,format:'iife',platform:'browser',target:['es2022'],minify:true,write:false,metafile:true,outfile:'offline.js',define:{'process.env.NODE_ENV':'"production"','import.meta.env.DEV':'false','import.meta.env.PROD':'false'},plugins:[{name:'offline-assets',setup(b){
 b.onLoad({filter:/[/\\]Chronicle\.tsx$/},async args=>{let contents=await readFile(args.path,'utf8');const marker='src={`./continent-${f}.svg`}';assert.ok(contents.includes(marker),'Opening asset reference changed');contents=contents.replace(marker,'src={OFFLINE_CONTINENTS[f]}');return {contents:`const OFFLINE_CONTINENTS=${JSON.stringify(continents)};\n`+contents,loader:'tsx',resolveDir:path.dirname(args.path)};});
 b.onLoad({filter:/[/\\]challenge\.ts$/},async args=>{let contents=await readFile(args.path,'utf8');contents=contents.replace("const {hostname}=new URL(address);", "if(new URL(address).protocol==='file:')return true;const {hostname}=new URL(address);");return {contents,loader:'ts',resolveDir:path.dirname(args.path)};});
} }]});
const js=result.outputFiles.find(f=>f.path.endsWith('.js'))?.text,css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text;
assert.ok(js&&css);assert.ok(!css.match(/url\(\s*['"]?(?!data:|#)/),'Offline CSS must not request external assets');
new Script(js,{filename:'sphere-influence-offline.js'});
assert.ok(Object.values(result.metafile.outputs).every(o=>o.imports.length===0),'No external imports or chunks');
assert.ok(!js.includes('./continent-'),'Opening SVGs must be embedded');
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>Сферы влияния — автономная игра</title><style>${css.replace(/<\/style/gi,'<\\/style')}</style></head><body><div id="root"></div><noscript>Для запуска игры включите JavaScript в браузере.</noscript><script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
assert.ok(!/<(?:script|link)\b[^>]*(?:src|href)\s*=/.test(html),'All scripts and styles must be embedded');
await mkdir('offline',{recursive:true});
const filename='offline/sphere-influence-offline.html';await writeFile(filename,html);
console.log(`${filename}: ${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB; embedded engine, map, CSS and four opening fragments; no server or service worker.`);
