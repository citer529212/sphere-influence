import type { QuickState,ActionEvent } from './quickGame';
import type { FactionId,Region,ControllerId } from './types';
import { FACTION_IDS,REALMS } from './realms';
export const INDEPENDENTS={
 platforms:{name:'Лига платформ',symbol:'▣',color:'#71c9c2',goal:'Внимание и дистрибуция',rule:'Рекомендательные ленты усиливают надёжных партнёров. Площадки развивают алгоритмы и рекламную инфраструктуру, чтобы увеличивать бюджет партнёров.',treaty:'Четыре хода дистрибуции: +1…3 медиаресурса за ход, в зависимости от развития платформ.'},
 archives:{name:'Архивная республика',symbol:'▤',color:'#b6a4de',goal:'Достоверность',rule:'Проверяет усталые аудитории и заявления лидера с доверием ниже 55%. Расследование снимает 4 поддержки; обычный щит блокирует его.',treaty:'Четыре хода сотрудничества: +4 доверия сразу; ваши заявления защищены от расследований при доверии не ниже 45%.'},
 radio:{name:'Союз кочевых медиа',symbol:'◉',color:'#e0bd76',goal:'Разнообразие голосов',rule:'Независимые авторы и локальные сообщества без соглашения дают +3 поддержки самой слабой повестке в своём городе. Среди партнёров предпочитает наиболее надёжного.',treaty:'Четыре хода охвата всех городов союза и их соседей. Эфир может поддержать вас: решают доверие и отношения.'},

} as const;
export type IndependentId=keyof typeof INDEPENDENTS;
export type ActorId=FactionId|IndependentId;
export type IndependentState={id:IndependentId;cities:string[];budget:number;level:number;relations:Record<FactionId,number>;pacts:Record<FactionId,number>;lastContact:Record<FactionId,number>};
export const INDEPENDENT_IDS=Object.keys(INDEPENDENTS) as IndependentId[];
export function isCrown(actor:ActorId):actor is FactionId{return FACTION_IDS.includes(actor as FactionId);}
export function actorIdentity(actor:ActorId){return isCrown(actor)?REALMS[actor]:INDEPENDENTS[actor];}
const record=(value:number):Record<FactionId,number>=>({atlas:value,meridian:value,concordat:value});
export function createIndependents(regions:Region[]):IndependentState[]{
 const neutral=regions.filter(r=>r.politicalOwner==='neutral');
 return INDEPENDENT_IDS.map((id,i)=>({id,cities:neutral.filter((_,j)=>j%3===i).map(r=>r.id),budget:5,level:0,relations:record(0),pacts:record(0),lastContact:record(0)})).filter(s=>s.cities.length);
}
export function hasPact(s:QuickState,b:IndependentState,actor:FactionId){return b.pacts[actor]>=s.turn;}
export function independentCityId(regions:Region[],id:string):IndependentId|null{const i=regions.filter(r=>r.politicalOwner==='neutral').findIndex(r=>r.id===id);return i<0?null:INDEPENDENT_IDS[i%3];}
export function independentFor(s:QuickState,city:string){return s.independents?.find(b=>b.cities.includes(city));}
export function diplomacyError(s:QuickState,id:IndependentId,actor=s.player):string|null{
 const b=s.independents?.find(b=>b.id===id);if(!b)return 'Держава не представлена на этой карте';
 if(s.result)return 'Партия завершена';if(actor===s.player&&s.actions<1)return 'Нет решений';
 if(b.lastContact[actor]===s.turn)return 'Переговоры уже проведены в этом ходу';
 if(hasPact(s,b,actor))return `Договор действует до хода ${b.pacts[actor]} включительно`;
 if((actor===s.player?s.influence:s.rivalBudget[actor])<4)return 'Нужно 4 медиаресурса';
 return null;
}
export function applyDiplomacy(s:QuickState,id:IndependentId,actor=s.player):boolean{
 if(diplomacyError(s,id,actor))return false;const b=s.independents!.find(b=>b.id===id)!;
 if(actor===s.player){s.influence-=4;s.actions--;}else s.rivalBudget[actor]-=4;
 b.budget=Math.min(30,b.budget+2);b.relations[actor]=Math.min(75,b.relations[actor]+20);b.pacts[actor]=s.turn+3;b.lastContact[actor]=s.turn;
 if(id==='archives'){if(actor===s.player)s.trust=Math.min(100,s.trust+4);else s.rivalTrust[actor]=Math.min(100,s.rivalTrust[actor]+4);}
 s.log.unshift(`${REALMS[actor].name}: соглашение с «${INDEPENDENTS[id].name}» до хода ${s.turn+3}.`);s.log=s.log.slice(0,8);return true;
}
export function independentIncome(s:QuickState,actor:FactionId){const b=s.independents?.find(b=>b.id==='platforms');return b&&hasPact(s,b,actor)?1+b.level:0;}
export function independentReach(s:QuickState,actor:FactionId,links:[number,number][],reached:Set<number>){
 for(const b of s.independents??[])if(b.id==='radio'&&hasPact(s,b,actor))for(const id of b.cities){const i=s.regions.findIndex(r=>r.id===id);if(i<0)continue;reached.add(i);for(const [a,c] of links){if(a===i)reached.add(c);if(c===i)reached.add(a);}}
}
export function independentIntent(s:QuickState,b:IndependentState){
 if(b.budget+3+(b.id==='platforms'?b.level:0)<4)return 'Накопление средств';
 if(b.id==='platforms'&&s.turn%3===0&&b.budget+3>=6&&b.level<2)return 'Развитие платформ';
 return b.id==='platforms'?'Рекомендательная лента':b.id==='archives'?'Проверка источников':'Эфир сообществ';
}
export function advanceIndependents(s:QuickState,controller:(r:Region)=>ControllerId,onStep?:(event:Omit<ActionEvent,'id'>)=>void):Omit<ActionEvent,'id'>[]{
 const events:Omit<ActionEvent,'id'>[]=[];
 for(const b of s.independents??[]){
  b.budget=Math.min(30,b.budget+3+(b.id==='platforms'?b.level:0));
  const homes=s.regions.filter(r=>b.cities.includes(r.id));if(!homes.length)continue;
  const city=homes[(s.turn-1)%homes.length];
  const trust=(f:FactionId)=>f===s.player?s.trust:s.rivalTrust[f];
  const order=[...FACTION_IDS.slice(s.turn%3),...FACTION_IDS.slice(0,s.turn%3)];
  const strongest=[...order].sort((a,c)=>city.influence[c]-city.influence[a])[0];
  const reliable=[...order].filter(f=>trust(f)>=45).sort((a,c)=>(trust(c)+b.relations[c]+(hasPact(s,b,c)?20:0))-(trust(a)+b.relations[a]+(hasPact(s,b,a)?20:0)))[0]??order[0];
  let text='',amount=0;
  const weaken=(actor:FactionId,value:number)=>{
   if(city.factCheckShield[actor]){city.factCheckShield[actor]=0;return 'проверка фактов заблокировала воздействие';}
   amount=-Math.min(value,city.influence[actor]);city.influence[actor]+=amount;
   return `${REALMS[actor].name}: поддержка ${amount}`;
  };
  if(b.id==='platforms'&&s.turn%3===0&&b.level<2&&b.budget>=6){b.budget-=6;b.level++;text=`Инфраструктура платформ: уровень ${b.level}. Доход действующим партнёрам +${1+b.level}/ход`;}
  else if(b.budget<4)text=`Накапливает средства: казна ${b.budget}, действие стоит 4`;
  else{
   b.budget-=4;
   if(b.id==='platforms'){
    if(trust(reliable)>=45){amount=Math.min(3,100-city.influence[reliable]);city.influence[reliable]+=amount;text=`Рекомендательная лента усиливает «${REALMS[reliable].name}»: +${amount}. Причина: доверие и отношения`;}
    else{city.fatigue=Math.max(0,city.fatigue-3);text='Площадки не находят надёжного партнёра: местное обсуждение, усталость −3';}
   }else if(b.id==='archives'){
    if((trust(strongest)<55||city.fatigue>=20)&&!(hasPact(s,b,strongest)&&trust(strongest)>=45))text=`Расследование: ${weaken(strongest,4)}. Причина: доверие ${trust(strongest)}%, усталость ${city.fatigue}%`;
    else{city.fatigue=Math.max(0,city.fatigue-4);text='Открытая проверка источников: усталость −4. Достоверная повестка сохранена';}
   }else if(b.id==='radio'){
    const partners=order.filter(f=>hasPact(s,b,f));
    const actor=partners.length?[...partners].sort((a,c)=>trust(c)+b.relations[c]-trust(a)-b.relations[a])[0]:[...order].sort((a,c)=>city.influence[a]-city.influence[c])[0];
    amount=Math.min(partners.length?4:3,100-city.influence[actor]);city.influence[actor]+=amount;text=`Эфир общин: «${REALMS[actor].name}» +${amount}. Причина: ${partners.length?'договор и репутация':'поддержка слабого голоса'}`;
   }
  }
  city.infoController=controller(city);
  const message=`${city.name}: ${text}`;s.log.unshift(`${INDEPENDENTS[b.id].name}: ${message}`);s.log=s.log.slice(0,8);
  const event:Omit<ActionEvent,'id'>={kind:'independent',actor:b.id,regionId:city.id,amount,text:message};events.push(event);onStep?.(event);
 }
 return events;
}
