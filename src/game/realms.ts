import { FactionId } from './types';
export const REALMS:Record<FactionId,{name:string;ruler:string;title:string;culture:string;color:string;symbol:string;quote:string;privilege:string;drawback:string;mediaCost:number;campaign:number;fatigue:number;trustCost:number;protection:number;income:number}>= {
 atlas:{name:'Синий Атлас',ruler:'Королева Виктория',title:'Корона морей',culture:'Европейская цивилизация · парламентская корона',color:'#56b5fa',symbol:'♛',quote:'«Мир связывают торговля и доверие».',privilege:'Торговые хартии: медиацентр стоит 4 вместо 5.',drawback:'Шум кампаний: усталость +14 вместо +10.',mediaCost:4,campaign:0,fatigue:14,trustCost:3,protection:10,income:4},
 meridian:{name:'Красный Меридиан',ruler:'Император Рэн',title:'Алый престол',culture:'Азиатская монархия · императорский двор',color:'#f16c65',symbol:'♜',quote:'«Разделённый мир нуждается в порядке».',privilege:'Дворцовая стража: укрепление даёт +15 поддержки вместо +10.',drawback:'Жёсткая иерархия: кампании дают на 3 поддержки меньше.',mediaCost:5,campaign:-3,fatigue:10,trustCost:3,protection:15,income:4},
 concordat:{name:'Жёлтый Конкорданс',ruler:'Царица Амина',title:'Голос совета',culture:'Африканская конфедерация · союз корон и общин',color:'#f3cf62',symbol:'♚',quote:'«Союз крепок, пока слышен каждый голос».',privilege:'Совет общин: базовый доход 5 вместо 4.',drawback:'Цена согласия: кампания отнимает 4 доверия вместо 3.',mediaCost:5,campaign:0,fatigue:10,trustCost:4,protection:10,income:5}
};
export const FACTION_IDS: FactionId[]=['atlas','meridian','concordat'];
export const CITY_CLIMATES=['polar','polar','temperate','arid','temperate','temperate','temperate','temperate','polar','temperate','tropical','temperate'] as const;
export const CLIMATE_NAMES={polar:'Полярный',temperate:'Умеренный',arid:'Засушливый',tropical:'Тропический'};
export const SEASONS=['Весна','Лето','Осень','Зима'];
export function season(turn:number):number{return Math.floor((turn-1)/2)%4;}
export function climateEffect(turn:number,index:number):number {const zone=CITY_CLIMATES[index],s=season(turn);return zone==='polar'&&s===3?-3:zone==='arid'&&s===1?-3:zone==='tropical'&&s===2?-2:s===0?1:0;}
export function climateDescription(turn:number,index:number):string {const effect=climateEffect(turn,index);return `${CLIMATE_NAMES[CITY_CLIMATES[index]]} · ${SEASONS[season(turn)]} · ${effect===0?'кампании без поправки':`поддержка кампании ${effect>0?'+':''}${effect}`}`;}
