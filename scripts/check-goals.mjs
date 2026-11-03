import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({stdin:{contents:`export * from './src/game/goals';export * from './src/game/quickGame';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const g=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const lead=(game,count)=>{game.regions.forEach((r,i)=>{r.influence=i<count?{atlas:100,meridian:0,concordat:0}:{atlas:0,meridian:100,concordat:0};r.infoController=i<count?'atlas':'meridian';});};
// Regression from the screenshot: 14 cities, trust 89%, hold 1/2, time exhausted.
const old=g.createQuickGame('screenshot','atlas','expert');old.regions=old.regions.slice(0,22);lead(old,14);old.trust=89;old.turn=36;old.held=1;old.result='loss';
let p=g.victoryProgress(old,{goal:14,trust:50,hold:2,limit:36});assert.equal(p.completed,2);assert.equal(p.overall,83);assert.equal(p.gates[0].percent,100);assert.equal(p.gates[1].percent,100);assert.equal(p.gates[2].percent,50);assert.ok(p.reason.includes('подтверждений подряд — ещё 1'));assert.ok(p.reason.includes('Лимит ходов исчерпан'));assert.equal(p.checksLeft,0);
for(const difficulty of ['discovery','standard','expert']){
 const s=g.createQuickGame('goal-progress','atlas',difficulty),target=g.objective(s);lead(s,target.goal);s.trust=target.trust;s.held=0;
 p=g.victoryProgress(s);assert.ok(p.overall<100);assert.ok(p.qualified);assert.equal(p.gates[2].percent,0);assert.equal(p.firstBy,target.limit-target.hold+1);
 s.turn=target.limit;s.held=0;p=g.victoryProgress(s);assert.equal(p.checksLeft,1);assert.equal(!!p.warning,target.hold>1);
 s.held=target.hold-1;p=g.victoryProgress(s);assert.equal(p.warning,null,'The last available check can still complete an existing streak');
 s.held=target.hold;s.result='win';p=g.victoryProgress(s);assert.equal(p.overall,100);assert.equal(p.completed,3);
 s.result=null;s.held=1;s.trust=target.trust-3;p=g.victoryProgress(s);assert.ok(!p.qualified);assert.ok(p.gates[1].missing.includes('3 п.п.'));assert.ok(p.warning.includes('обнулится'));
}
let s=g.createQuickGame('real-hold','atlas','standard');lead(s,10);s.trust=80;s.rivalBudget={atlas:0,meridian:0,concordat:0};s.independents=[];s.turn=23;
s=g.quickEndTurn(s);assert.equal(s.held,1);assert.equal(s.result,null);assert.ok(g.victoryProgress(s).overall<100);if(g.pendingWorldEvent(s))s=g.resolveWorldEvent(s,'listen');s=g.quickEndTurn(s);assert.equal(s.result,'win');assert.equal(g.victoryProgress(s).overall,100);
console.log('Goals passed: screenshot regression, separate city/trust/hold percentages, 100% only on confirmed victory, exact deadline checks, last-turn feasibility, streak-reset warning and real two-check victory.');
