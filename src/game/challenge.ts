import { controlled, QUICK_LIMIT, QuickState, RULESET_VERSION } from './quickGame';

export type ChallengeGoal={seed:string;turns:number;trust:number};
export type SharedChallenge={seed?:string;goal:ChallengeGoal|null;unsupported:boolean};
export const validChallengeCode=(value:string|null):value is string=>!!value&&/^[a-zA-Z0-9-]{1,40}$/.test(value);
export function parseSharedChallenge(search:string):SharedChallenge {
  const params=new URLSearchParams(search),code=params.get('challenge'),rules=params.get('rules');
  const seed=validChallengeCode(code)?code:undefined;
  const unsupported=!!seed&&rules!==null&&rules!==RULESET_VERSION;
  const beat=params.get('beat'),trust=params.get('trust');
  const validScore=!!beat&&/^\d{1,2}$/.test(beat)&&Number(beat)>=1&&Number(beat)<=QUICK_LIMIT&&trust!==null&&/^\d{1,3}$/.test(trust)&&Number(trust)<=100;
  return {seed,unsupported,goal:seed&&!unsupported&&validScore?{seed,turns:Number(beat),trust:Number(trust)}:null};
}
export function challengeUrl(base:string,game:QuickState):string {
  const url=new URL(base);url.search='';url.hash='';url.searchParams.set('challenge',game.seed);url.searchParams.set('rules',RULESET_VERSION);
  if(game.result==='win'){url.searchParams.set('beat',String(game.turn));url.searchParams.set('trust',String(game.trust));}
  return url.href;
}
export function isLocalAddress(address:string):boolean {
  const {hostname}=new URL(address);return hostname==='localhost'||hostname.endsWith('.localhost')||hostname==='127.0.0.1'||hostname==='[::1]';
}
export function challengeText(base:string,game:QuickState):string {
  const label=game.result==='win'?'Победа':game.result==='loss'?'Партия завершена':'Мой результат';
  return `Сферы влияния · ${game.seed}\n${label}: ${controlled(game)}/12 городов. Ход: ${game.turn}. Доверие: ${game.trust}%.\nСможешь собрать 8 городов быстрее? При равном ходе выигрывает большее доверие.\n${isLocalAddress(base)?`Код карты: ${game.seed} · Правила ${RULESET_VERSION}`:challengeUrl(base,game)}`;
}
export function compareChallenge(game:QuickState,goal:ChallengeGoal|null):string|null {
  if(!goal||goal.seed!==game.seed||game.result!=='win')return null;
  if(game.turn<goal.turns||game.turn===goal.turns&&game.trust>goal.trust)return 'Вы побили результат друга!';
  if(game.turn===goal.turns&&game.trust===goal.trust)return 'Вы повторили результат друга.';
  return 'Победа есть. Теперь попробуйте обойти результат друга.';
}
