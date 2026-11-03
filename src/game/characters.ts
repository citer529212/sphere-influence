import { EventOption } from './events';
export const CHARACTERS={
 courier:{name:'Сафия Ветер',title:'Хозяйка Вольной почты',symbol:'✉',color:'#77cfc1',motto:'«Границы закрывают ворота, но не письма».',story:'После разрыва атласа Сафия сохранила морские маршруты. Она служит сообщениям, а не коронам.',mechanic:'Три хода доступа к удалённому городу и его соседям. Договор действует до указанного хода включительно.'},
 archivist:{name:'Ильна Соль',title:'Хранительница общего архива',symbol:'⌘',color:'#bfade5',motto:'«У каждого обещания есть память».',story:'Ильна собирает три обрывка первой карты и сверяет заявления правителей с прежними обещаниями.',mechanic:'Три хода без штрафа за повтор темы кампании. Усталость аудитории продолжает действовать.'},
 editor:{name:'Марк Север',title:'Редактор «Четвёртого голоса»',symbol:'◇',color:'#e6b881',motto:'«Ни одна корона не владеет истиной».',story:'Его независимая редакция публикует расследования против всех трёх дворов. Он помогает тем, кто открывает источники.',mechanic:'Одноразовый щит во всех городах, где вы лидируете: каждый щит блокирует одно чужое воздействие.'}
} as const;
export type CharacterId=keyof typeof CHARACTERS;
export type Accord={npc:CharacterId;regionId:string;expires:number};
export function characterAt(turn:number):CharacterId{return (['courier','archivist','editor'] as const)[(Math.floor(turn/4)-1)%3]??'courier';}
export function characterEvent(turn:number){
 const npc=characterAt(turn),c=CHARACTERS[npc];
 const act=Math.min(2,Math.floor((turn-1)/12));
 const chapter=['I · Письма расколотого мира','II · Война чужих заголовков','III · Кто напишет мир'][act];
 const revelation=[
 'С разрывом карты исчезла единая хроника. Каждый двор называет свою версию правдой. Независимые голоса предлагают восстановить связи.',
 'В городах появляются одинаковые ложные письма от имени всех трёх корон. Ни одна держава не может очистить эфир в одиночку. Сохраните сеть доверия, пока соперники переписывают прошлое.',
 'Последний обрывок атласа найден. На нём не граница, а общий почтовый маршрут. Новый мир получит тот, кто удержит поддержку без потери доверия.'
 ][act];
 const options:EventOption[]=[
 {id:'verify',title:npc==='courier'?'Заключить почтовый договор':npc==='archivist'?'Открыть архив обещаний':'Допустить независимую проверку',text:c.mechanic,resource:npc==='editor'?-6:-4,trust:8,support:8,fatigue:-4},
 {id:'broadcast',title:'Использовать встречу для кампании',text:'Получить поддержку сразу, пожертвовав доверием. Особое соглашение не заключается.',resource:-3,trust:-6,support:18,fatigue:8},
 {id:'listen',title:'Выслушать и сохранить независимость',text:'Спокойный диалог без расходов и без особого соглашения.',resource:0,trust:3,support:4,fatigue:-4}
 ];
 return {npc,chapter,title:`${c.name}: ${npc==='courier'?'письмо через границы':npc==='archivist'?'память расколотого мира':'цена открытого слова'}`,text:`${revelation} ${c.story} ${c.motto}`,options};
}
