export type DifficultyId='discovery'|'standard'|'expert';
export type TopicId='development'|'freedoms'|'stability';
export const DIFFICULTIES={
 discovery:{name:'Знакомство',goal:8,limit:18,hold:1,trust:35,aiActions:1,aiGain:6,description:'Освойте кампании и медиасеть. Соперники отвечают мягко.'},
 standard:{name:'Борьба повесток',goal:10,limit:24,hold:2,trust:45,aiActions:1,aiGain:8,description:'Соперники развивают медиа и защищают аудиторию. Лидерство нужно удержать.'},
 expert:{name:'Информационный шторм',goal:12,limit:30,hold:2,trust:50,aiActions:2,aiGain:5,description:'По два решения у каждого соперника. Борьба за охват, доверие и устойчивое лидерство.'}
} as const;
export const TOPICS={development:{name:'Развитие',icon:'◈',description:'Экономика, образование и новые возможности'},freedoms:{name:'Открытость',icon:'✧',description:'Культура, диалог и участие'},stability:{name:'Достоверность',icon:'◇',description:'Проверяемые факты и надёжные институты'}};
export const CITY_TOPICS:TopicId[]=['freedoms','stability','development','freedoms','stability','stability','development','development','freedoms','development','freedoms','development','stability','development','freedoms','stability'];
// Editorial partnerships and broadcast relays, not transport or invasion routes.
export const MEDIA_LINKS:[number,number][]=[[0,1],[1,2],[2,3],[4,5],[5,6],[5,7],[8,9],[9,11],[11,10],[0,12],[1,12],[2,13],[3,15],[12,13],[13,14],[14,15],[12,4],[13,5],[14,7],[15,6],[12,8],[13,9],[14,11],[15,10]];
const NEWS=[
 {title:'Города ищут свой голос',text:'Местная повестка важнее общего лозунга. Совпадение темы даёт +5 поддержки.',topic:null,bonus:0,trustBonus:0},
 {title:'Форум будущего',text:'Кампании о развитии получают +4 поддержки. Проверяйте интерес города.',topic:'development',bonus:4,trustBonus:0},
 {title:'Неделя открытого диалога',text:'Открытость получает +4 поддержки. Проверка фактов восстанавливает на 2 доверия больше.',topic:'freedoms',bonus:4,trustBonus:2},
 {title:'Запрос на достоверность',text:'Тема достоверности получает +4 поддержки. Укрепляйте доверие перед новыми кампаниями.',topic:'stability',bonus:4,trustBonus:0}
] as const;
export function newsAt(turn:number){return NEWS[Math.floor((turn-1)/4)%NEWS.length];}
