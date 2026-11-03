import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/game/tutorial';export {pendingWorldEvent,mediaReach,decisionLimit} from './src/game/quickGame';export {CITY_TOPICS} from './src/game/information';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const t=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
assert.equal(new Set(t.LESSONS.map(l=>l.id)).size,t.LESSONS.length);
for(const player of ['atlas','meridian','concordat'])for(const lesson of t.LESSONS){let s=t.createPractice(lesson.id,player);const initial=structuredClone(s),send=e=>{const before=structuredClone(s),old=s;s=t.practiceStep(s,e);assert.deepEqual(old,before,'Practice transitions must not mutate previous snapshots');};
 if(lesson.kind==='longCampaign')send({type:'campaign',channel:'community'});
 if(lesson.kind==='diplomacy')send({type:'diplomacy',id:'platforms'});
 if(lesson.kind==='goals')send({type:'goals'});
 if(lesson.kind==='quiz'){assert.ok(lesson.quiz&&lesson.quiz.correct>=0&&lesson.quiz.correct<lesson.quiz.answers.length);continue;}
 if(lesson.kind==='select')send({type:'select',id:s.game.regions.find(r=>r.id!==s.initial).id});
 if(lesson.kind==='topic')send({type:'topic',topic:t.CITY_TOPICS[s.game.regions.findIndex(r=>r.id===s.selected)]});
 if(['campaign','neutral','shield'].includes(lesson.kind))send({type:'action',action:'attract'});
 if(lesson.kind==='repeat'){send({type:'action',action:'attract'});send({type:'action',action:'attract'});}
 if(lesson.kind==='protect')send({type:'action',action:'protect'});
 if(['media','third'].includes(lesson.kind))send({type:'action',action:'media'});
 if(lesson.kind==='network'){const before=t.mediaReach(s.game).size;send({type:'network'});send({type:'action',action:'media'});assert.ok(t.mediaReach(s.game).size>before,`Network example must unlock cities for ${player}`);}
 if(['turn','victory','rival','diplomacy','goals','longCampaign'].includes(lesson.kind)){send({type:'turn'});let limit=10;while(s.frames.length&&--limit)send({type:'frame'});assert.ok(limit>0);}
 if(lesson.kind==='specialty')send({type:'select',id:s.game.regions[2].id});
 if(lesson.kind==='event'){const decisions=s.game.actions;send({type:'event',id:t.pendingWorldEvent(s.game).options[0].id});assert.equal(s.game.actions,decisions);const after=structuredClone(s.game);send({type:'event',id:'verify'});assert.deepEqual(s.game,after,'Events cannot be repeated');}
 if(lesson.kind==='longCampaign')for(let round=0;round<2;round++){send({type:'turn'});let limit=15;while(s.frames.length&&--limit)send({type:'frame'});assert.ok(limit>0);}
 if(lesson.kind==='goals'){send({type:'turn'});let limit=12;while(s.frames.length&&--limit)send({type:'frame'});assert.ok(limit>0);}
 assert.ok(t.practiceComplete(lesson,s),`${player}: ${lesson.id} must be achievable`);
 if(lesson.kind==='shield'){assert.equal(s.game.regions.find(r=>r.id===s.initial).influence[player],initial.game.regions.find(r=>r.id===s.initial).influence[player]);assert.equal(s.game.actions,1);}
}
const entries=new Map(),store={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};assert.deepEqual(t.loadLearning(store),{index:0,completed:[]});assert.ok(t.saveLearning(store,{index:4,completed:['map','topics']}));assert.equal(entries.size,1);assert.equal([...entries.keys()][0],t.LEARNING_KEY);assert.deepEqual(t.loadLearning(store),{index:4,completed:['map','topics']});
for(const value of ['{','null',JSON.stringify({version:1,index:99,completed:[]}),JSON.stringify({version:0,index:3,completed:[]})]){store.setItem(t.LEARNING_KEY,value);assert.deepEqual(t.loadLearning(store),{index:0,completed:[]});}
const denied={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};assert.equal(t.saveLearning(denied,{index:0,completed:[]}),false);assert.deepEqual(t.loadLearning(denied),{index:0,completed:[]});
console.log(`Tutorial checks passed: ${t.LESSONS.length} lessons, every exercise achievable for all three rulers, immutable practice, real rule thresholds, events once-only, separate progress and unavailable storage.`);

for(const id of ['goal-streak','diplomacy-practice','campaign-practice']){const sample=t.createPractice(id,'atlas'),blocked=t.practiceStep(sample,{type:'turn'});assert.equal(blocked.frames.length,0,'The lesson must require its interactive preparation before resolving turns');assert.deepEqual(blocked.game,sample.game);}
