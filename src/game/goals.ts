import { QuickState,controlled,objective } from './quickGame';
import { REALMS } from './realms';
type GoalTarget={goal:number;trust:number;hold:number;limit:number};
export function victoryProgress(game:QuickState,target:GoalTarget=objective(game)){
 const cities=controlled(game),cityMissing=Math.max(0,target.goal-cities),trustMissing=Math.max(0,target.trust-game.trust),holdMissing=Math.max(0,target.hold-game.held);
 const qualified=!cityMissing&&!trustMissing;
 const percent=(current:number,needed:number)=>Math.floor(Math.min(1,Math.max(0,current)/needed)*100);
 const gates=[
  {id:'cities',name:'Лидерство в городах',current:cities,target:target.goal,percent:percent(cities,target.goal),complete:!cityMissing,missing:cityMissing?`Нужно ещё ${cityMissing} городов с вашей ведущей повесткой`:'Нужное число городов достигнуто',help:'Нужно опережать ближайшую корону минимум на 5 пунктов. Для нейтральной аудитории дополнительно требуется от 55% поддержки.'},
  {id:'trust',name:'Доверие державе',current:game.trust,target:target.trust,percent:percent(game.trust,target.trust),complete:!trustMissing,missing:trustMissing?`Не хватает ${trustMissing} п.п. доверия`:'Доверия достаточно',help:'Проверка фактов восстанавливает доверие. Кампании расходуют его. Высокая поддержка отдельного города не заменяет доверие державе.'},
  {id:'hold',name:'Подтверждения подряд',current:game.held,target:target.hold,percent:percent(game.held,target.hold),complete:!holdMissing,missing:holdMissing?(holdMissing===1?'Не хватает одного итогового подтверждения':`Не хватает ${holdMissing} итоговых подтверждений`):'Удержание подтверждено',help:'Одно подтверждение начисляется в конце хода, после всех ответов и пассивных изменений, если и города, и доверие остаются выше порогов. При невыполнении хотя бы одного порога серия обнуляется.'}
 ];
 const overall=game.result==='win'?100:Math.min(99,Math.floor(gates.reduce((n,g)=>n+g.percent,0)/3));
 const checksLeft=game.result?0:Math.max(0,target.limit-game.turn+1);
 const shortages=[cityMissing?`городов — ещё ${cityMissing}`:null,trustMissing?`доверия — ещё ${trustMissing} п.п.`:null,holdMissing?`подтверждений подряд — ещё ${holdMissing}`:null].filter(Boolean);
 const reason=game.result==='win'?'Все три условия выполнены. Победа подтверждена.':game.result==='loss'?(game.winner?`${REALMS[game.winner].name} выиграл гонку раньше вас. `:'Лимит ходов исчерпан. ')+(shortages.length?`Не выполнено: ${shortages.join('; ')}.`:'Партия завершена.'):!qualified?`Сначала выполните пороги: ${shortages.filter(x=>!x!.startsWith('подтверждений')).join('; ')}. Затем сохраняйте оба условия до итоговых проверок.`:`Города и доверие достигнуты. Осталось ${holdMissing} ${holdMissing===1?'подтверждение':holdMissing>1&&holdMissing<5?'подтверждения':'подтверждений'} после ответных ходов. Это ещё не победа.`;
 const warning=!game.result&&checksLeft<holdMissing?`Для удержания нужно ещё ${holdMissing} итоговых проверок, а до лимита осталось ${checksLeft}. В этой партии времени на победу уже не хватает.`:!game.result&&!qualified&&game.held>0?'Если не восстановить оба порога к концу хода, серия подтверждений обнулится.':null;
 return {gates,overall,qualified,reason,warning,checksLeft,holdMissing,target,firstBy:target.limit-target.hold+1,completed:gates.filter(g=>g.complete).length};
}
