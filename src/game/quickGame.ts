import { REALMS, FACTION_IDS, climateEffect } from './realms';
import { createInitialState } from './data';
import { FactionId, Region } from './types';

export type QuickAction = 'media' | 'attract' | 'protect';
export type QuickState = { seed: string; player:FactionId; turn: number; actions: number; influence: number; trust: number; regions: Region[]; log: string[]; result: 'win' | 'loss' | null };
export const RULESET_VERSION = '3';
export const QUICK_GOAL = 8;
export const QUICK_TOTAL = 16;
export const NEUTRAL_SUPPORT = 55;
export const QUICK_LIMIT = 15;
export const QUICK_ACTIONS = {
  media: { name: 'Медиацентр', cost: 5, description: 'Город приносит +1 влияния каждый ход. Один центр на город.', effect: 'Долгосрочный доход' },
  attract: { name: 'Привлечь город', cost: 3, description: 'Рост поддержки зависит от доверия и усталости. Повторные кампании утомляют город.', effect: 'Ближе к переходу на вашу сторону' },
  protect: { name: 'Укрепить доверие', cost: 2, description: '+6 доверия, +10 поддержки в городе и защита от следующего ответа соперника.', effect: 'Доверие усиливает будущие кампании' }
} as const;
export function dailySeed(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function hash(text: string): number { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
export function createQuickGame(seed: string, player:FactionId='atlas'): QuickState {
  const all = createInitialState().regions;
  const ids = ['mist-isles','northern-reef','polar-coast','deep-bay','northern-hills','heart-meridian','volcanic-plateau','crimson-canyon','iris-delta','emerald-delta','southern-archipelago','central-delta','north-isthmus','stone-strait','fog-isthmus','south-strait'];
  const factions: FactionId[] = ['atlas', 'meridian', 'concordat'];
  const regions = ids.map((id, i) => {
    const source = all.find(r => r.id === id)!;
    const owner = i<12?factions[Math.floor(i / 4)]:'neutral' as const;
    const region: Region = structuredClone(source);
    region.politicalOwner = owner; region.infoController = owner==='neutral'?'contested':owner;
    region.influence = { atlas: 18, meridian: 18, concordat: 18 };
    if(owner==='neutral')region.influence={atlas:8,meridian:8,concordat:8};else region.influence[owner] = 62 + hash(seed + id) % 10;
    region.mediaNodes = { atlas: 0, meridian: 0, concordat: 0 };
    region.factCheckShield = { atlas: 0, meridian: 0, concordat: 0 };
    region.fatigue = 0;
    return region;
  });
  return { seed, player, turn: 1, actions: 2, influence: 12, trust: 60, regions, log: ['Получите поддержку 8 из 16 городов за 15 ходов.'], result: null };
}
export function controlled(state: QuickState): number { return state.regions.filter(r => r.infoController === state.player).length; }
export function supportLead(region: Region, player:FactionId='atlas'): number { return Math.max(...FACTION_IDS.filter(f=>f!==player).map(f=>region.influence[f])); }
export function actionCost(state:QuickState,action:QuickAction):number{return action==='media'?REALMS[state.player].mediaCost:QUICK_ACTIONS[action].cost;}
export function turnIncome(state:QuickState):number{return REALMS[state.player].income+state.regions.reduce((sum,r)=>sum+(r.infoController===state.player?r.mediaNodes[state.player]:0),0);}
export function campaignGain(state: QuickState, region: Region): number { return Math.max(12, 22 + Math.floor(state.trust / 8) - Math.floor(region.fatigue / 6) + REALMS[state.player].campaign + climateEffect(state.turn,state.regions.findIndex(r=>r.id===region.id))); }
export function regionController(region:Region):Region['infoController'] {
  const ranked=[...FACTION_IDS].sort((a,b)=>region.influence[b]-region.influence[a]);
  if(region.politicalOwner==='neutral'&&region.influence[ranked[0]]<NEUTRAL_SUPPORT)return 'contested';
  return region.influence[ranked[0]]-region.influence[ranked[1]]>=5?ranked[0]:'contested';
}
function recalculate(region:Region):void {region.infoController=regionController(region);}
export function supportNeeded(region:Region,player:FactionId):number{return Math.max(0,supportLead(region,player)+5-region.influence[player],region.politicalOwner==='neutral'?NEUTRAL_SUPPORT-region.influence[player]:0);}
function finish(state: QuickState): void {
  if (controlled(state) >= QUICK_GOAL) { state.result = 'win'; state.log.unshift(`Победа! ${controlled(state)} городов поддерживают вас на ${state.turn}-м ходу.`); }
  else if (state.turn > QUICK_LIMIT) { state.result = 'loss'; state.turn = QUICK_LIMIT; state.log.unshift('Время вышло. Попробуйте другой маршрут к влиянию.'); }
  state.log = state.log.slice(0, 8);
}
export function actionError(state: QuickState, region: Region, action: QuickAction): string | null {
  if (state.result) return 'Партия завершена';
  if (state.actions < 1) return 'Завершите ход';
  if (state.influence < actionCost(state,action)) return 'Не хватает влияния';
  if (action === 'media' && region.infoController !== state.player) return 'Нужен город на вашей стороне';
  if (action === 'media' && region.mediaNodes[state.player] > 0) return 'Медиацентр уже построен';
  return null;
}
export function quickAction(current: QuickState, id: string, action: QuickAction): QuickState {
  const target = current.regions.find(r => r.id === id);
  if (!target || actionError(current, target, action)) return current;
  const state = structuredClone(current), region = state.regions.find(r => r.id === id)!;
  state.influence -= actionCost(state,action); state.actions--;
  if (action === 'media') { region.mediaNodes[state.player] = 1; state.log.unshift(`«${region.name}»: открыт медиацентр. Доход +1 за ход.`); }
  if (action === 'attract') { const gain = campaignGain(state, region); region.influence[state.player] = Math.min(100, region.influence[state.player] + gain); region.fatigue = Math.min(100, region.fatigue + REALMS[state.player].fatigue); state.trust = Math.max(0, state.trust - REALMS[state.player].trustCost); state.log.unshift(`«${region.name}»: поддержка +${gain}. Доверие −${REALMS[state.player].trustCost}.`); }
  if (action === 'protect') { region.influence[state.player] = Math.min(100, region.influence[state.player] + REALMS[state.player].protection); region.factCheckShield[state.player] = 1; region.fatigue = Math.max(0, region.fatigue - 10); state.trust = Math.min(100, state.trust + 6); state.log.unshift(`«${region.name}»: поддержка +${REALMS[state.player].protection}, защита до следующего хода. Доверие +6.`); }
  const previous = region.infoController; recalculate(region);
  if (previous !== state.player && region.infoController === state.player) { FACTION_IDS.filter(f=>f!==state.player).forEach(f=>region.influence[f]=Math.max(0,region.influence[f]-12)); state.log.unshift(`Город «${region.name}» перешёл на вашу сторону! Поддержка соперников −12.`); }
  finish(state); return state;
}
export type ActionEvent={id:number;kind:QuickAction|'opponent'|'blocked'|'income';actor:FactionId;regionId?:string;amount:number;captured?:boolean;text:string};
export type TurnFrame={state:QuickState;event:Omit<ActionEvent,'id'>};
export function planQuickEndTurn(current:QuickState):TurnFrame[] {
  if(current.result)return [];
  const state=structuredClone(current),frames:TurnFrame[]=[];
  for(const faction of FACTION_IDS.filter(f=>f!==state.player)){
    const candidates=state.regions.filter(r=>r.infoController!==faction).sort((a,b)=>{
      const score=(r:Region)=>(r.politicalOwner===faction?25:0)+(r.politicalOwner==='neutral'?18:0)+(r.infoController===state.player?10:0)+r.influence[faction]-Math.max(...Object.values(r.influence))+hash(state.seed+state.turn+r.id+faction)%15;
      return score(b)-score(a);
    });
    const region=candidates[0];
    if(!region){frames.push({state:structuredClone(state),event:{kind:'opponent',actor:faction,amount:0,text:'Наблюдает за миром'}});continue;}
    const previous=region.infoController,blocked=region.factCheckShield[state.player]>0;
    const amount=blocked?0:Math.min(6,100-region.influence[faction]);
    if(blocked)state.log.unshift(`«${region.name}»: ваша защита сдержала соперника.`);
    else{region.influence[faction]+=amount;recalculate(region);state.log.unshift(`«${region.name}»: ответ соперника, поддержка +${amount}.`);}
    frames.push({state:structuredClone(state),event:{kind:blocked?'blocked':'opponent',actor:faction,regionId:region.id,amount,captured:previous!==region.infoController&&region.infoController===faction,text:blocked?`«${region.name}»: защита сработала`:`«${region.name}»: поддержка +${amount}${previous!==region.infoController?' · контроль изменился':''}`}});
  }
  const income=turnIncome(state);state.influence+=income;
  state.regions.forEach(r=>{r.fatigue=Math.max(0,r.fatigue-4);r.factCheckShield[state.player]=0;});
  state.turn++;state.actions=2;state.log.unshift(`Новый ход: +${income} влияния. Соперники ответили.`);finish(state);
  frames.push({state:structuredClone(state),event:{kind:'income',actor:state.player,amount:income,text:`Ваш ход · +${income} влияния · усталость −4, временные щиты сняты`}});
  return frames;
}
export function quickEndTurn(current:QuickState):QuickState {return planQuickEndTurn(current).at(-1)?.state??current;}
