import { createQuickGame, dailySeed, QuickState, controlled, QUICK_LIMIT, RULESET_VERSION, QUICK_TOTAL, regionController, objective, decisionLimit } from './quickGame';

import { DIFFICULTIES, DifficultyId, TOPICS } from './information';

export interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void; }
export type Session = { game:QuickState; selectedId:string; savedAt:string };
export type Preferences = { sound:boolean; tutorialStep:number };
const PREFIX='spheres.session.v4:';
const LAST='spheres.last.v4';
const PREFS='spheres.preferences.v1';
const validSeed=(seed:unknown):seed is string=>typeof seed==='string'&&/^[a-zA-Z0-9-]{1,40}$/.test(seed);
const integer=(n:unknown,min:number,max:number):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const factions=['atlas','meridian','concordat'] as const;

export function browserStorage():StorageLike|null { try{return window.localStorage;}catch{return null;} }
export function saveSession(storage:StorageLike|null,game:QuickState,selectedId:string):boolean {
  if(!storage)return false;
  try {
    storage.setItem(PREFIX+game.seed+':'+game.difficulty,JSON.stringify({version:1,rules:RULESET_VERSION,game,selectedId,savedAt:new Date().toISOString()}));
    storage.setItem(LAST,JSON.stringify({seed:game.seed,difficulty:game.difficulty}));return true;
  }catch{return false;}
}
export function loadSession(storage:StorageLike|null,seed:string,difficulty:DifficultyId='standard'):Session|null {
  if(!storage||!validSeed(seed))return null;
  try {
    const raw=storage.getItem(PREFIX+seed+':'+difficulty);if(!raw)return null;
    const value:unknown=JSON.parse(raw);
    if(!object(value)||value.version!==1||(value.rules!==undefined&&value.rules!==RULESET_VERSION)||!object(value.game)||typeof value.savedAt!=='string'||!Number.isFinite(Date.parse(value.savedAt)))return null;
    const saved=value.game;
    if(saved.difficulty!==difficulty||!Object.hasOwn(DIFFICULTIES,difficulty)||!Object.hasOwn(TOPICS,String(saved.topic))||!integer(saved.held,0,DIFFICULTIES[difficulty].hold)||!object(saved.rivalBudget)||!object(saved.rivalTrust))return null;
    if(saved.seed!==seed||!integer(saved.turn,1,QUICK_LIMIT)||!integer(saved.actions,0,3)||!integer(saved.influence,0,10000)||!integer(saved.trust,0,100))return null;
    if(saved.result!==null&&saved.result!=='win'&&saved.result!=='loss')return null;
    if(!Array.isArray(saved.regions)||saved.regions.length!==QUICK_TOTAL||!Array.isArray(saved.log)||saved.log.length>8||!saved.log.every(line=>typeof line==='string'&&line.length<=500))return null;
    // Rebuild immutable names, types and ownership from the current scenario.
    if(!factions.includes(saved.player as typeof factions[number]))return null;
    const game=createQuickGame(seed,saved.player as typeof factions[number],difficulty);
    for(let i=0;i<game.regions.length;i++) {
      const source:unknown=saved.regions[i],target=game.regions[i];
      if(!object(source)||source.id!==target.id||!object(source.influence)||!object(source.mediaNodes)||!object(source.factCheckShield))return null;
      if(!integer(source.fatigue,0,100)||!['atlas','meridian','concordat','contested'].includes(String(source.infoController)))return null;
      for(const faction of factions){
        if(!integer(source.influence[faction],0,100)||!integer(source.mediaNodes[faction],0,1)||!integer(source.factCheckShield[faction],0,1))return null;
        target.influence[faction]=source.influence[faction];target.mediaNodes[faction]=source.mediaNodes[faction];target.factCheckShield[faction]=source.factCheckShield[faction];
      }
      const controller=regionController(target);
      if(source.infoController!==controller)return null;
      target.infoController=controller;target.fatigue=source.fatigue;
    }
    for(const faction of factions){if(!integer(saved.rivalBudget[faction],0,10000)||!integer(saved.rivalTrust[faction],0,100))return null;game.rivalBudget[faction]=saved.rivalBudget[faction];game.rivalTrust[faction]=saved.rivalTrust[faction];}
    game.topic=saved.topic as typeof game.topic;game.held=saved.held;
    game.turn=saved.turn;game.actions=saved.actions;game.influence=saved.influence;game.trust=saved.trust;game.result=saved.result;game.log=saved.log as string[];
    const mode=objective(game);if(game.turn>mode.limit||game.actions>decisionLimit(game))return null;
    if((game.result==='win')!==(game.held===mode.hold)||game.result==='win'&&(controlled(game)<mode.goal||game.trust<mode.trust)||game.result==='loss'&&game.turn!==mode.limit)return null;
    const selectedId=typeof value.selectedId==='string'&&game.regions.some(r=>r.id===value.selectedId)?value.selectedId:game.regions[0].id;
    return {game,selectedId,savedAt:value.savedAt};
  }catch{return null;}
}
export function startSession(storage:StorageLike|null,requestedSeed?:string,today=dailySeed(),requestedDifficulty?:DifficultyId):{session:Session;restored:boolean}{
 const seed=validSeed(requestedSeed)?requestedSeed:today,difficulty=requestedDifficulty??'standard';
 if(!requestedSeed&&!requestedDifficulty&&storage){try{const raw=storage.getItem(LAST),last=raw?JSON.parse(raw):null;if(object(last)&&validSeed(last.seed)&&Object.hasOwn(DIFFICULTIES,String(last.difficulty))){const previous=loadSession(storage,last.seed,last.difficulty as DifficultyId);if(previous&&(!previous.game.result||last.seed===today))return {session:previous,restored:true};}}catch{/* Start a fresh map when storage is unavailable. */}}
 const previous=loadSession(storage,seed,difficulty);if(previous)return {session:previous,restored:true};
 const game=createQuickGame(seed,'atlas',difficulty);return {session:{game,selectedId:game.regions[0].id,savedAt:''},restored:false};
}
export function loadPreferences(storage:StorageLike|null):Preferences {
  try{const raw=storage?.getItem(PREFS);const value:unknown=raw?JSON.parse(raw):null;if(object(value)&&typeof value.sound==='boolean'&&integer(value.tutorialStep,0,3))return {sound:value.sound,tutorialStep:value.tutorialStep};}catch{/* Defaults also work without storage. */}
  return {sound:true,tutorialStep:0};
}
export function savePreferences(storage:StorageLike|null,prefs:Preferences):void {try{storage?.setItem(PREFS,JSON.stringify(prefs));}catch{/* Preferences remain active for this session. */}}
