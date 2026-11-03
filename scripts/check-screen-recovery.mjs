import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// Render the actual React school for every saved lesson, not only its game rules.
const file=new URL('../.school-render-check.mjs',import.meta.url);
try{
 const bundle=await build({stdin:{contents:`import React from 'react';import {renderToString} from 'react-dom/server';import Tutorial from './src/ui/Tutorial';import IndependentPanel from './src/ui/IndependentPanel';import GoalsPanel from './src/ui/GoalsPanel';import CampaignPlanner from './src/ui/CampaignPlanner';import {createQuickGame,negotiateIndependent} from './src/game/quickGame';export {LESSONS,LEARNING_KEY} from './src/game/tutorial';export {turnReadingTime} from './src/ui/turnTiming';export const planner=(player,difficulty)=>{const game=createQuickGame('planner-render',player,difficulty);return renderToString(React.createElement(CampaignPlanner,{game,regionId:game.regions.find(r=>r.politicalOwner===player).id,onLaunch:()=>{}}));};export const goals=(player,difficulty)=>renderToString(React.createElement(GoalsPanel,{game:createQuickGame('goal-render',player,difficulty),onClose:()=>{},checkpointPending:true}));export const panel=(player,difficulty)=>renderToString(React.createElement(IndependentPanel,{game:negotiateIndependent(createQuickGame('dialog-render',player,difficulty),'platforms'),onClose:()=>{},onChoose:()=>{}}));export const render=player=>renderToString(React.createElement(Tutorial,{player,onClose:()=>{}}));`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',write:false});
 writeFileSync(file,bundle.outputFiles[0].text);
 const school=await import(file.href);let saved;
 globalThis.window={localStorage:{getItem:()=>saved}};
 for(const player of ['atlas','meridian','concordat'])for(let index=0;index<school.LESSONS.length;index++){
  saved=JSON.stringify({version:1,index,completed:[]});
  const html=school.render(player);assert.ok(html.includes(school.LESSONS[index].title));assert.ok(!html.includes('undefined'));
 }
 for(const actor of ['atlas','meridian','concordat'])for(const mode of ['discovery','standard','expert']){const planHtml=school.planner(actor,mode);assert.ok(planHtml.includes('Новостная сеть'));assert.ok(planHtml.includes('Вирусный эфир'));assert.ok(planHtml.includes('Сеть сообществ'));assert.ok(!planHtml.includes('undefined'));const goalHtml=school.goals(actor,mode);assert.ok(goalHtml.includes('Подтверждения подряд'));assert.ok(goalHtml.includes('промежуточные'));const html=school.panel(actor,mode);assert.ok(html.includes('Лига платформ'));assert.ok(html.replace(/<[^>]*>/g,'').includes('Ваш договор действует до хода 4'));assert.ok(!html.includes('undefined'));assert.ok(html.includes('Архивная республика'));assert.ok(html.includes('Союз кочевых медиа'));}
 saved='{';assert.ok(school.render('atlas').includes(school.LESSONS[0].title));
 assert.ok(school.turnReadingTime('Короткое действие')>=4200);assert.ok(school.turnReadingTime('Длинное действие '.repeat(40))>=7500);
 delete globalThis.window;
}finally{unlinkSync(file);}
// An already open old release must still load its cached lazy screens after an update.
const listeners={},stores=new Map();
for(const key of ['sphere-influence-0.15','sphere-influence-0.16','sphere-influence-0.17','unrelated-project'])stores.set(key,new Map());
stores.get('sphere-influence-0.17').set('https://game.test/assets/old-school.js',new Response('old school'));
let rejectWrites=false;
const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{if(!stores.has(key))stores.set(key,new Map());return {addAll:async urls=>{for(const url of urls)stores.get(key).set(url,new Response('screen'));},match:async request=>stores.get(key).get(request.url??request),put:async(request,response)=>{if(rejectWrites)throw Error('quota');stores.get(key).set(request.url??request,response);}};},match:async request=>{for(const map of stores.values())if(map.has(request.url??request))return map.get(request.url??request);}};
const self={registration:{scope:'https://game.test/'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>listeners[name]=fn};
runInNewContext(readFileSync('public/sw.js','utf8'),{self,caches,URL,Response,fetch:async request=>String(request).endsWith('build-assets.json')?Response.json(['./assets/new-school.js']):new Response('fresh network')});
let pending;listeners.install({waitUntil:p=>pending=p});await pending;
listeners.activate({waitUntil:p=>pending=p});await pending;
assert.ok(stores.has('unrelated-project'));assert.ok(stores.has('sphere-influence-0.17'));assert.ok(!stores.has('sphere-influence-0.15'));
listeners.fetch({request:{url:'https://game.test/assets/old-school.js',method:'GET',headers:new Headers()},respondWith:p=>pending=p});assert.equal(await (await pending).text(),'old school');
rejectWrites=true;
listeners.fetch({request:{url:'https://game.test/something-new',method:'GET',headers:new Headers()},respondWith:p=>pending=p});assert.equal(await (await pending).text(),'fresh network','Cache quota must not break a working network response');
console.log('Screen recovery passed: 75 real school renders, nine diplomacy, nine goals and nine campaign planner renders, malformed progress, readable turns, pre-cached screens, retained old chunks, unrelated caches and quota-safe network.');
