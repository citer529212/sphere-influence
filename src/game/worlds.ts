import {Region,PoliticalOwnerId} from './types';
import {DifficultyId,CITY_TOPICS,CITY_ROLES,MEDIA_LINKS} from './information';
export const WORLD_IDS=['mist-isles','northern-reef','polar-coast','deep-bay','northern-hills','heart-meridian','volcanic-plateau','crimson-canyon','iris-delta','emerald-delta','southern-archipelago','central-delta','north-isthmus','stone-strait','fog-isthmus','south-strait','atlas-relay','atlas-exchange','meridian-relay','meridian-academy','concordat-relay','concordat-forum'] as const;
export const WORLD_NAMES:Record<string,string>={'atlas-relay':'Западный ретранслятор','atlas-exchange':'Гавань хартии','meridian-relay':'Алый ретранслятор','meridian-academy':'Нефритовая академия','concordat-relay':'Золотой ретранслятор','concordat-forum':'Форум общин'};
const small=[0,1,2,4,5,6,8,9,10,12],standard=Array.from({length:16},(_,i)=>i),large=Array.from({length:22},(_,i)=>i);
export const WORLD_LAYOUTS={discovery:{indices:small,name:'Малая карта'},standard:{indices:standard,name:'Большой атлас'},expert:{indices:large,name:'Расширенный мир'}};
export function worldFor(difficulty:DifficultyId){return WORLD_LAYOUTS[difficulty];}
export function cityIndex(region:Pick<Region,'id'>){return WORLD_IDS.indexOf(region.id as typeof WORLD_IDS[number]);}
export function cityOwner(index:number):PoliticalOwnerId{return index<12?(['atlas','meridian','concordat'] as const)[Math.floor(index/4)]:index<16?'neutral':(['atlas','meridian','concordat'] as const)[Math.floor((index-16)/2)];}
export function regionTopic(region:Pick<Region,'id'>){return CITY_TOPICS[cityIndex(region)];}
export function regionRole(region:Pick<Region,'id'>){return CITY_ROLES[cityIndex(region)];}
const extra:[number,number][]=[[0,16],[1,16],[16,17],[17,3],[17,13],[4,18],[5,18],[18,19],[19,7],[19,14],[8,20],[9,20],[20,21],[21,11],[21,15],[16,18],[18,20],[20,16]];
const smallLinks:[number,number][]=[[0,1],[1,2],[4,5],[5,6],[8,9],[9,10],[1,12],[5,12],[9,12],[2,6],[6,10],[10,2]];
export function worldLinks(state:{regions:Pick<Region,'id'>[]}):[number,number][]{const ids=state.regions.map(cityIndex),lookup=new Map(ids.map((id,i)=>[id,i]));return (ids.length===10?smallLinks:[...MEDIA_LINKS,...extra]).filter(([a,b])=>lookup.has(a)&&lookup.has(b)).map(([a,b])=>[lookup.get(a)!,lookup.get(b)!]);}
