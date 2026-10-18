import { createQuickGame, dailySeed, QuickState, controlled, QUICK_GOAL, QUICK_LIMIT, RULESET_VERSION } from './quickGame';

export interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void; }
export type Session = { game:QuickState; selectedId:string; savedAt:string };
export type Preferences = { sound:boolean; tutorialStep:number };
const PREFIX='spheres.session.v1:';
const LAST='spheres.last.v1';
const PREFS='spheres.preferences.v1';
const validSeed=(seed:unknown):seed is string=>typeof seed==='string'&&/^[a-zA-Z0-9-]{1,40}$/.test(seed);
const integer=(n:unknown,min:number,max:number):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const factions=['atlas','meridian','concordat'] as const;

export function browserStorage():StorageLike|null { try{return window.localStorage;}catch{return null;} }
export function saveSession(storage:StorageLike|null,game:QuickState,selectedId:string):boolean {
  if(!storage)return false;
  try {
    storage.setItem(PREFIX+game.seed,JSON.stringify({version:1,rules:RULESET_VERSION,game,selectedId,savedAt:new Date().toISOString()}));
    storage.setItem(LAST,game.seed);return true;
  }catch{return false;}
}
export function loadSession(storage:StorageLike|null,seed:string):Session|null {
  if(!storage||!validSeed(seed))return null;
  try {
    const raw=storage.getItem(PREFIX+seed);if(!raw)return null;
    const value:unknown=JSON.parse(raw);
    if(!object(value)||value.version!==1||(value.rules!==undefined&&value.rules!==RULESET_VERSION)||!object(value.game)||typeof value.savedAt!=='string'||!Number.isFinite(Date.parse(value.savedAt)))return null;
    const saved=value.game;
    if(saved.seed!==seed||!integer(saved.turn,1,QUICK_LIMIT)||!integer(saved.actions,0,2)||!integer(saved.influence,0,10000)||!integer(saved.trust,0,100))return null;
    if(saved.result!==null&&saved.result!=='win'&&saved.result!=='loss')return null;
    if(!Array.isArray(saved.regions)||saved.regions.length!==12||!Array.isArray(saved.log)||saved.log.length>8||!saved.log.every(line=>typeof line==='string'&&line.length<=500))return null;
    // Rebuild immutable names, types and ownership from the current scenario.
    const game=createQuickGame(seed);
    for(let i=0;i<game.regions.length;i++) {
      const source:unknown=saved.regions[i],target=game.regions[i];
      if(!object(source)||source.id!==target.id||!object(source.influence)||!object(source.mediaNodes)||!object(source.factCheckShield))return null;
      if(!integer(source.fatigue,0,100)||!['atlas','meridian','concordat','contested'].includes(String(source.infoController)))return null;
      for(const faction of factions){
        if(!integer(source.influence[faction],0,100)||!integer(source.mediaNodes[faction],0,faction==='atlas'?1:0)||!integer(source.factCheckShield[faction],0,faction==='atlas'?1:0))return null;
        target.influence[faction]=source.influence[faction];target.mediaNodes[faction]=source.mediaNodes[faction];target.factCheckShield[faction]=source.factCheckShield[faction];
      }
      const ranked=[...factions].sort((a,b)=>target.influence[b]-target.influence[a]);
      const controller=target.influence[ranked[0]]-target.influence[ranked[1]]>=5?ranked[0]:'contested';
      if(source.infoController!==controller)return null;
      target.infoController=controller;target.fatigue=source.fatigue;
    }
    game.turn=saved.turn;game.actions=saved.actions;game.influence=saved.influence;game.trust=saved.trust;game.result=saved.result;game.log=saved.log as string[];
    if((game.result==='win')!==(controlled(game)>=QUICK_GOAL)||game.result==='loss'&&game.turn!==QUICK_LIMIT)return null;
    const selectedId=typeof value.selectedId==='string'&&game.regions.some(r=>r.id===value.selectedId)?value.selectedId:game.regions[0].id;
    return {game,selectedId,savedAt:value.savedAt};
  }catch{return null;}
}
export function startSession(storage:StorageLike|null,requestedSeed?:string,today=dailySeed()):{session:Session;restored:boolean} {
  let seed=validSeed(requestedSeed)?requestedSeed:today;
  if(!requestedSeed&&storage){
    try{const last=storage.getItem(LAST);if(validSeed(last)){const previous=loadSession(storage,last);if(previous&&(!previous.game.result||last===today))return {session:previous,restored:true};}}catch{/* Start today's map if storage is unavailable. */}
  }
  const previous=loadSession(storage,seed);if(previous)return {session:previous,restored:true};
  const game=createQuickGame(seed);return {session:{game,selectedId:game.regions[0].id,savedAt:''},restored:false};
}
export function loadPreferences(storage:StorageLike|null):Preferences {
  try{const raw=storage?.getItem(PREFS);const value:unknown=raw?JSON.parse(raw):null;if(object(value)&&typeof value.sound==='boolean'&&integer(value.tutorialStep,0,3))return {sound:value.sound,tutorialStep:value.tutorialStep};}catch{/* Defaults also work without storage. */}
  return {sound:true,tutorialStep:0};
}
export function savePreferences(storage:StorageLike|null,prefs:Preferences):void {try{storage?.setItem(PREFS,JSON.stringify(prefs));}catch{/* Preferences remain active for this session. */}}
