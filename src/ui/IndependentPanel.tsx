import { QuickState,pendingWorldEvent } from '../game/quickGame';
import { INDEPENDENTS,IndependentId,diplomacyError,hasPact,independentIntent } from '../game/independents';
import { FACTION_IDS,REALMS } from '../game/realms';
import { Modal } from './Modal';
export default function IndependentPanel({game,onChoose,onClose,initialId}:{initialId?:IndependentId;game:QuickState;onChoose:(id:IndependentId)=>void;onClose:()=>void}){
 return <Modal titleId="independent-title" onClose={onClose} className="independent-panel">
  <span className="guide-eyebrow">СОВЕТ НЕЗАВИСИМЫХ · ХОД {game.turn}</span><h2 id="independent-title" data-autofocus tabIndex={-1}>У серых островов есть свой голос</h2>
  <p>Эти державы ходят после трёх корон. Они сохраняют собственность на города, даже если там лидирует чужая повестка. Договор стоит 4 медиаресурса и одно решение; действует текущий ход и ещё три. Договоры доступны всем коронам, они не исключительные. Обычное действие независимой державы стоит 4 единицы её казны: при нехватке она копит средства.</p>
  <div className="independent-cards">{(game.independents??[]).slice().sort((a,b)=>Number(b.id===initialId)-Number(a.id===initialId)).map(b=>{const c=INDEPENDENTS[b.id],error=pendingWorldEvent(game)?'Сначала ответьте на сюжетное событие':diplomacyError(game,b.id);return <article key={b.id} style={{borderColor:c.color}}>
   <header><span style={{color:c.color}}>{c.symbol}</span><div><h3>{c.name}</h3><small>Цель: {c.goal}</small></div></header>
   <p>{c.rule}</p><p className="independent-intent"><b>Намерение на ответный ход:</b> {independentIntent(game,b)}</p>
   <p>Казна: {b.budget} · доход +{3+(b.id==='platforms'?b.level:0)}/ход {b.id==='platforms'?`· развитие: ${b.level}/2`:null}</p>
   <details><summary>Города и отношения с коронами</summary><p>{b.cities.map(id=>game.regions.find(r=>r.id===id)?.name).join(', ')}</p>{FACTION_IDS.map(f=><p key={f} style={{color:REALMS[f].color}}>{REALMS[f].name}: отношения {b.relations[f]} · {hasPact(game,b,f)?`договор до хода ${b.pacts[f]}`:'нет договора'}</p>)}</details>
   <p className="independent-offer">{c.treaty}</p>{hasPact(game,b,game.player)&&<p>Ваш договор действует до хода {b.pacts[game.player]} включительно.</p>}<button disabled={!!error} onClick={()=>onChoose(b.id)}>{error??'Заключить соглашение · 4 ◈ · 1 решение'}</button>
  </article>;})}</div>
  <p>Информационное лидерство в городе считается обычным способом. Независимые державы не участвуют в гонке корон за победу: они защищают местные интересы. На каждой карте представлены все три независимые силы. Играть можно только за одну из трёх корон.</p><button onClick={onClose}>Вернуться к карте</button>
 </Modal>;
}
