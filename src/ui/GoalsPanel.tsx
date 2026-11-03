import { QuickState,rivalObjective } from '../game/quickGame';
import { victoryProgress } from '../game/goals';
import { FACTION_IDS,REALMS } from '../game/realms';
import { Modal } from './Modal';
export default function GoalsPanel({game,onClose,checkpointPending=false}:{checkpointPending?:boolean;game:QuickState;onClose:()=>void}){
 const p=victoryProgress(game),race=rivalObjective(game);
 return <Modal titleId="goals-title" onClose={onClose} className="goals-panel">
  <span className="guide-eyebrow">ЦЕЛИ ПАРТИИ · ХОД {game.turn}/{p.target.limit}</span>
  <h2 id="goals-title" data-autofocus tabIndex={-1}>Что нужно для победы</h2>
  {checkpointPending&&<p className="goals-warning">Просмотр ответных действий приостановлен. Показатели промежуточные: итоговая проверка ещё не завершена. Закройте цели и нажмите «Продолжить» в блоке ходов.</p>}
  <div className="goals-overall"><strong>{p.overall}%</strong><span>{p.completed}/3 условий выполнено</span><progress value={p.overall} max={100} aria-label="Общий прогресс целей"/></div>
  <p>Процент учитывает все три шкалы, включая частично пройденное удержание. 100% означает подтверждённую победу.</p>
  <p className="goals-reason" role="status">{p.reason}</p>{p.warning&&<p className="goals-warning">⚠ {p.warning}</p>}
  <div className="goals-gates">{p.gates.map(g=><article key={g.id} className={g.complete?'complete':''}><header><h3>{g.complete?'✓':'○'} {g.name}</h3><b>{g.percent}%</b></header><div className="goal-numbers">{g.current}{g.id==='trust'?'%':''} / {g.id==='trust'?'≥':''}{g.target}{g.id==='trust'?'%':''}</div><progress value={g.percent} max={100} aria-label={g.name}/><strong>{g.missing}</strong><p>{g.help}</p></article>)}</div>
  <section className="goal-checks"><h3>Когда считается удержание</h3><ol><li>Во время своего хода добейтесь нужных городов и доверия.</li><li>Нажмите «Завершить ход». Ответят соперники и независимые державы.</li><li>После этапов кампаний и пассивных изменений игра проверит оба порога и добавит одно подтверждение. Иначе серия станет 0.</li><li>Для победы нужно {p.target.hold} таких подтверждений подряд до окончания {p.target.limit}-го хода включительно.</li></ol><p>Первое успешное подтверждение нужно получить не позднее конца <b>{p.firstBy}-го хода</b>. {game.result?'Партия завершена.':`Осталось итоговых проверок: ${p.checksLeft}, включая текущий ход.`}</p></section>
  {race&&<details><summary>Цели соперников</summary>{FACTION_IDS.filter(f=>f!==game.player).map(f=><p key={f}>{REALMS[f].name}: {game.regions.filter(r=>r.infoController===f).length}/{race.goal} городов · доверие {game.rivalTrust[f]}% из нужных {race.trust}% · подтверждения {game.rivalHeld[f]}/{race.hold}</p>)}</details>}
  <button onClick={onClose}>Вернуться к карте</button>
 </Modal>;
}
