import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const a=await load('src/game/challenge.ts'),g=await load('src/game/quickGame.ts');
for(const difficulty of ['discovery','standard','expert'])for(const player of ['atlas','meridian','concordat']){
 const game=g.createQuickGame('same-world',player,difficulty);game.result='win';game.turn=12;game.trust=60;
 const url=a.challengeUrl('https://example.com/game/#old',game),parsed=a.parseSharedChallenge(new URL(url).search);assert.equal(parsed.difficulty,difficulty);assert.equal(parsed.player,player);assert.equal(parsed.goal.turns,12);assert.equal(new URL(url).hash,'');
 assert.deepEqual(g.createQuickGame(parsed.seed,parsed.player,parsed.difficulty),g.createQuickGame(game.seed,game.player,game.difficulty));assert.match(a.compareChallenge(game,parsed.goal),/повторили/);assert.match(a.compareChallenge({...game,turn:11},parsed.goal),/побили/);assert.match(a.compareChallenge({...game,difficulty:difficulty==='expert'?'standard':'expert'},parsed.goal),/сложность/);
 assert.ok(a.challengeText('https://example.com/game/',game).includes(url));assert.ok(!a.challengeText('http://127.0.0.1:5174/',game).includes('127.0.0.1'));
}
for(const search of ['?challenge=x&rules=3&beat=5&trust=60','?challenge=x&difficulty=__proto__&beat=5&trust=60','?challenge=x&rules=5&realm=atlas&difficulty=discovery&beat=19&trust=60','?challenge=x&beat=5&trust=60'])assert.equal(a.parseSharedChallenge(search).goal,null);
console.log('Challenge checks passed: same seed, faction, difficulty and rules; valid score limits; incomparable modes; safe local sharing.');
