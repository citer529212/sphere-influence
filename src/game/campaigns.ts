import type { QuickState,ActionEvent } from './quickGame';
import { FactionId,Region,ControllerId } from './types';
import { TopicId } from './information';
import { regionTopic,worldLinks } from './worlds';
import { FACTION_IDS,REALMS } from './realms';
export const CHANNELS={
 newsroom:{name:'Новостная сеть',medium:'Репортажи, данные, объясняющие материалы',duration:2,cost:5,base:8,rule:'Два этапа. Доверие от 60% даёт +3 за этап; подходящая тема +2. Нужен действующий охват на каждом этапе. После завершения +2 доверия.'},
 broadcast:{name:'Вирусный эфир',medium:'Короткие видео, рекламные размещения, рекомендательные ленты',duration:2,cost:6,base:14,rule:'Первый импульс +14, второй +8; подходящая тема +2. Репосты дают +3 в двух соседних аудиториях. Запуск −2 доверия. Если ко второму этапу доверие ниже 45% или усталость от 60%, он даёт −6 поддержки и −3 доверия.'},
 community:{name:'Сеть сообществ',medium:'Локальные авторы, обсуждения, обратная связь',duration:3,cost:4,base:6,rule:'Три этапа по +6, подходящая тема +2. Каждый этап +1 доверия и −3 усталости; последний выдаёт щит. Продолжает работу при потере внешнего охвата.'}
} as const;
export type CampaignChannel=keyof typeof CHANNELS;
export const DOCTRINES={
 atlas:{name:'Доказательная сеть',channel:'newsroom' as CampaignChannel,bonus:'Новостные кампании: +3 поддержки на каждом этапе. Сильная сеть и репутация важнее краткого шума.'},
 meridian:{name:'Синхронный медийный удар',channel:'broadcast' as CampaignChannel,bonus:'Вирусный эфир: +4 к первому импульсу. Второй этап требует сдержать усталость и сохранить доверие.'},
 concordat:{name:'Распределённое доверие',channel:'community' as CampaignChannel,bonus:'Кампании сообществ: +3 на каждом этапе. Медленный рост сочетается с восстановлением доверия и защитой.'}
} as const;
export type ActiveCampaign={id:string;actor:FactionId;regionId:string;channel:CampaignChannel;topic:TopicId;started:number;stage:number};
type Reach=(state:QuickState,actor:FactionId)=>Set<number>;
export function campaignError(state:QuickState,id:string,channel:CampaignChannel,reach:Reach,actor=state.player):string|null{
 if(!Object.hasOwn(CHANNELS,channel))return 'Неизвестное средство';
 if(state.result)return 'Партия завершена';
 if(actor===state.player&&state.actions<1)return 'Нет решений';
 if(state.activeCampaigns?.some(c=>c.actor===actor))return 'У державы уже идёт кампания';
 const i=state.regions.findIndex(r=>r.id===id);if(i<0)return 'Неизвестный город';
 if(!reach(state,actor).has(i))return 'Нужен стартовый охват аудитории';
 if((actor===state.player?state.influence:state.rivalBudget[actor])<CHANNELS[channel].cost)return 'Не хватает медиабюджета';
 return null;
}
export function applyCampaign(state:QuickState,id:string,channel:CampaignChannel,reach:Reach,actor=state.player,topic:TopicId=state.topic):boolean{
 if(campaignError(state,id,channel,reach,actor))return false;
 const c=CHANNELS[channel];if(actor===state.player){state.influence-=c.cost;state.actions--;}else state.rivalBudget[actor]-=c.cost;
 if(channel==='broadcast'){if(actor===state.player)state.trust=Math.max(0,state.trust-2);else state.rivalTrust[actor]=Math.max(0,state.rivalTrust[actor]-2);}
 state.activeCampaigns??=[];state.activeCampaigns.push({id:`${actor}:${state.turn}:${id}:${channel}`,actor,regionId:id,channel,topic,started:state.turn,stage:0});
 state.log.unshift(`${REALMS[actor].name}: запущена «${c.name}» в ${state.regions.find(r=>r.id===id)!.name}, ${c.duration} этапа.`);state.log=state.log.slice(0,8);return true;
}
export function stageGain(state:QuickState,c:ActiveCampaign,r:Region){
 const trust=c.actor===state.player?state.trust:state.rivalTrust[c.actor];
 if(c.channel==='broadcast'&&c.stage===1&&(trust<45||r.fatigue>=60))return -6;
 const base=c.channel==='broadcast'?(c.stage===0?14:8):CHANNELS[c.channel].base;
 const doctrine=c.actor==='atlas'&&c.channel==='newsroom'?3:c.actor==='meridian'&&c.channel==='broadcast'&&c.stage===0?4:c.actor==='concordat'&&c.channel==='community'?3:0;
 return base+doctrine+(c.channel==='newsroom'&&trust>=60?3:0)+(c.topic===regionTopic(r)?2:0);
}
export function advanceCampaigns(state:QuickState,reach:Reach,controller:(r:Region)=>ControllerId,onStep:(event:Omit<ActionEvent,'id'>)=>void){
 for(const c of [...state.activeCampaigns??[]]){
  const region=state.regions.find(r=>r.id===c.regionId);if(!region)continue;
  let gain=stageGain(state,c,region),blocked='',trustDelta=0,shieldGranted=false;const backlash=gain<0;
  const changes:NonNullable<ActionEvent['changes']>=[];
  if(c.channel==='newsroom'&&!reach(state,c.actor).has(state.regions.indexOf(region))){gain=0;blocked='Нет связи с редакциями: этап сорван';}
  else if(gain>0){const shield=FACTION_IDS.find(f=>f!==c.actor&&region.factCheckShield[f]);if(shield){region.factCheckShield[shield]=0;gain=0;blocked='Проверка фактов сдержала этап';}}
  if(!blocked){
   const before=region.influence[c.actor];region.influence[c.actor]=Math.max(0,Math.min(100,before+gain));gain=region.influence[c.actor]-before;
   if(c.channel==='community'){region.fatigue=Math.max(0,region.fatigue-3);trustDelta=1;}
   else region.fatigue=Math.min(100,region.fatigue+(c.channel==='broadcast'?8:2));
   if(c.channel==='broadcast'&&!backlash){const i=state.regions.indexOf(region),neighbors=[...new Set(worldLinks(state).flatMap(([a,b])=>a===i?[b]:b===i?[a]:[]))].slice(0,2);for(const j of neighbors){const r=state.regions[j],amount=Math.min(3,100-r.influence[c.actor]);r.influence[c.actor]+=amount;r.infoController=controller(r);if(amount)changes.push({regionId:r.id,actor:c.actor,amount});}}
   if(c.channel==='broadcast'&&backlash)trustDelta=-3;
   if(c.stage===CHANNELS[c.channel].duration-1){if(c.channel==='newsroom')trustDelta=2;if(c.channel==='community'){region.factCheckShield[c.actor]=1;shieldGranted=true;}}
  }
  if(c.actor===state.player)state.trust=Math.max(0,Math.min(100,state.trust+trustDelta));else state.rivalTrust[c.actor]=Math.max(0,Math.min(100,state.rivalTrust[c.actor]+trustDelta));
  region.infoController=controller(region);c.stage++;
  if(c.stage>=CHANNELS[c.channel].duration)state.activeCampaigns=state.activeCampaigns!.filter(x=>x.id!==c.id);
  const text=`${CHANNELS[c.channel].name} · ${region.name} · этап ${c.stage}/${CHANNELS[c.channel].duration}: ${blocked||`${backlash?'Репутационный откат · ':''}поддержка ${gain>=0?'+':''}${gain}${trustDelta?`, доверие ${trustDelta>0?'+':''}${trustDelta}`:''}${changes.length?', репосты в соседних аудиториях':''}`}`;
  state.log.unshift(`${REALMS[c.actor].name}: ${text}`);state.log=state.log.slice(0,8);onStep({kind:'campaign',campaignPhase:'tick',shieldGranted,actor:c.actor,regionId:c.regionId,amount:gain,text,changes});
 }
}
