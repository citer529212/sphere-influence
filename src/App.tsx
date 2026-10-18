import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MapLoading } from './components/MapLoading';
import { AssetBoundary } from './ui/AssetBoundary';
import { FACTIONS } from './game/data';
import { actionError, campaignGain, controlled, createQuickGame, dailySeed, QUICK_ACTIONS, QUICK_GOAL, QUICK_LIMIT, quickAction, quickEndTurn, QuickAction, QuickState, RULESET_VERSION, supportLead } from './game/quickGame';
import { browserStorage, loadPreferences, Preferences, savePreferences, saveSession, startSession } from './game/session';
import { REALMS, FACTION_IDS, climateDescription } from './game/realms';
import { FactionId } from './game/types';
import { RealmSelection, Opening, TurnTransition, Fireworks } from './ui/Chronicle';
import { actionCost, turnIncome } from './game/quickGame';
import { GameAudio } from './ui/audio';
import { Modal } from './ui/Modal';
import { challengeText, compareChallenge, parseSharedChallenge } from './game/challenge';

const WorldScene=lazy(()=>import('./components/WorldScene').then(module=>({default:module.WorldScene})));
const ResultCard=lazy(()=>import('./ui/ResultCard').then(module=>({default:module.ResultCard})));

type Feedback={id:number;title:string;detail:string};
const tutorial=[
  {title:'Выберите город',text:'Нажмите на название города на карте. Справа появятся его поддержка и доступные действия.'},
  {title:'Примите первое решение',text:'Постройте медиацентр в своём городе для дохода или привлеките чужой город. Цена и эффект указаны на кнопках.'},
  {title:'Дайте миру ответить',text:'У вас два решения за ход. Затем нажмите «Завершить ход»: соперники ответят, а вы получите влияние.'}
];
function opponentReport(before:QuickState,after:QuickState):string[] {
  return FACTION_IDS.filter(f=>f!==before.player).map(faction=>{
    const target=after.regions.find((r,i)=>r.influence[faction]>before.regions[i].influence[faction]);
    if(!target)return `${FACTIONS[faction].name}: нового влияния не получили.`;
    const old=before.regions.find(r=>r.id===target.id)!;
    return `${FACTIONS[faction].name}: «${target.name}», поддержка +${target.influence[faction]-old.influence[faction]}${old.infoController===before.player&&target.infoController!==before.player?' — ваш контроль ослаб':''}.`;
  });
}
export default function App():JSX.Element {
  const [boot]=useState(()=>{
    const storage=browserStorage(),challenge=parseSharedChallenge(window.location.search);
    const opened=startSession(storage,challenge.unsupported?undefined:challenge.seed);
    if(challenge.player&&!challenge.unsupported&&opened.session.game.player!==challenge.player){opened.session.game=createQuickGame(opened.session.game.seed,challenge.player);opened.session.selectedId=opened.session.game.regions.find(r=>r.politicalOwner===challenge.player)!.id;opened.restored=false;}
    return {storage,challenge,...opened,preferences:loadPreferences(storage)};
  });
  const [game,setGame]=useState(boot.session.game),[selectedId,setSelectedId]=useState(boot.session.selectedId);
  const [selection,setSelection]=useState(!boot.restored),[opening,setOpening]=useState(false),[turnAnimation,setTurnAnimation]=useState(false);
  const finishOpening=useCallback(()=>setOpening(false),[]),finishTurn=useCallback(()=>setTurnAnimation(false),[]);
  const [challenge,setChallenge]=useState(boot.challenge);
  const [mobilePanelOpen,setMobilePanelOpen]=useState(false);
  const cityPanel=useRef<HTMLElement>(null);
  const [preferences,setPreferences]=useState<Preferences>(boot.preferences);
  const [audio]=useState(()=>new GameAudio());
  const [rules,setRules]=useState(false),[shareText,setShareText]=useState(''),[shareStatus,setShareStatus]=useState(''),[code,setCode]=useState('');
  const [saved,setSaved]=useState(true),[resultOpen,setResultOpen]=useState(!!boot.session.game.result),[restartOpen,setRestartOpen]=useState(false);
  const [capture,setCapture]=useState<(()=>string)|null>(null);
  const [report,setReport]=useState<string[]>([]);
  const [feedback,setFeedback]=useState<Feedback|null>(boot.restored?{id:Date.now(),title:'Партия восстановлена',detail:`Карта ${boot.session.game.seed} · ход ${boot.session.game.turn}. Можно продолжать.`}:null);
  const captureReady=useCallback((fn:(()=>string)|null)=>setCapture(()=>fn),[]);
  const closeResult=useCallback(()=>setResultOpen(false),[]),closeRestart=useCallback(()=>setRestartOpen(false),[]);
  useEffect(()=>{if(!selection)setSaved(saveSession(boot.storage,game,selectedId));},[boot.storage,game,selectedId,selection]);
  useEffect(()=>{savePreferences(boot.storage,preferences);audio.setEnabled(preferences.sound);},[boot.storage,preferences,audio]);
  useEffect(()=>()=>audio.dispose(),[audio]);
  useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(null),4800);return()=>clearTimeout(timer);},[feedback]);
  useEffect(()=>{if(mobilePanelOpen)cityPanel.current?.querySelector<HTMLButtonElement>('.city-panel-close')?.focus();},[mobilePanelOpen,selectedId]);
  const region=game.regions.find(r=>r.id===selectedId)??game.regions[0];
  const cities=controlled(game),today=dailySeed();
  const income=turnIncome(game),player=game.player,realm=REALMS[player];
  const controller=region.infoController==='contested'?'Город колеблется':FACTIONS[region.infoController].name;
  const needed=Math.max(0,supportLead(region,game.player)+5-region.influence[game.player]);
  const notify=(title:string,detail:string)=>setFeedback({id:Date.now(),title,detail});
  const select=(id:string)=>{
    setSelectedId(id);setMobilePanelOpen(window.matchMedia('(max-width:1100px)').matches);void audio.play('select');
    setPreferences(p=>p.tutorialStep===0?{...p,tutorialStep:1}:p);
  };
  const act=(action:QuickAction)=>{
    if(selection||opening||turnAnimation)return;
    const next=quickAction(game,region.id,action);if(next===game)return;
    const updated=next.regions.find(r=>r.id===region.id)!;
    const gained=updated.influence[game.player]-region.influence[game.player];
    const captured=region.infoController!==game.player&&updated.infoController===game.player;
    const trust=next.trust-game.trust;
    notify(captured?`${region.name} — на вашей стороне`:QUICK_ACTIONS[action].name,
      `${gained?`Поддержка +${gained} · `:''}${trust?`Доверие ${trust>0?'+':''}${trust} · `:''}Влияние −${actionCost(game,action)}${action==='media'?' · Доход +1 за ход':''}`);
    setGame(next);setReport([]);
    setPreferences(p=>p.tutorialStep===1?{...p,tutorialStep:2}:p);
    void audio.play(next.result==='win'?'win':captured?'capture':action);
    if(next.result)setResultOpen(true);
  };
  const endTurn=()=>{
    if(turnAnimation||selection||opening)return;
    const next=quickEndTurn(game);if(next===game)return;setTurnAnimation(true);
    setReport(opponentReport(game,next));setGame(next);
    notify(next.result?'Партия завершена':`Ход ${next.turn} — ваш ход`,`Влияние +${next.influence-game.influence} · Города: ${controlled(next)} / 12`);
    setPreferences(p=>p.tutorialStep===2?{...p,tutorialStep:3}:p);
    void audio.play(next.result==='loss'?'loss':next.result==='win'?'win':'turn');
    if(next.result)setResultOpen(true);
  };
  const openMap=(seed:string)=>{
    const opened=startSession(boot.storage,seed);setGame(opened.session.game);setSelectedId(opened.session.selectedId);setShareText('');setShareStatus('');setReport([]);setResultOpen(!!opened.session.game.result);setSelection(!opened.restored);
    setChallenge({seed,goal:null,unsupported:false});setMobilePanelOpen(false);
    const url=new URL(window.location.href);url.search='';url.searchParams.set('challenge',seed);url.searchParams.set('rules',RULESET_VERSION);window.history.replaceState({},'',url);
    notify(opened.restored?'Партия восстановлена':'Карта открыта',`Код ${seed} · ход ${opened.session.game.turn}`);
  };
  const restart=()=>{
    const fresh=createQuickGame(game.seed,game.player);setGame(fresh);setSelectedId(fresh.regions[0].id);setShareText('');setShareStatus('');setReport([]);setResultOpen(false);setRestartOpen(false);setMobilePanelOpen(false);
    notify('Новая попытка',`Карта ${game.seed}. Найдите свой путь к восьми городам.`);
  };
  const chooseRuler=(f:FactionId)=>{const fresh=createQuickGame(game.seed,f);setGame(fresh);setSelectedId(fresh.regions.find(r=>r.politicalOwner===f)!.id);setSelection(false);setOpening(true);setResultOpen(false);setReport([]);setRestartOpen(false);};
  const cycleCity=(delta:number)=>{const i=game.regions.findIndex(r=>r.id===selectedId);select(game.regions[(i+delta+game.regions.length)%game.regions.length].id);};
  const share=async()=>{
    const text=challengeText(window.location.href,game);
    setShareText(text);
    try{await navigator.clipboard.writeText(text);setShareStatus('Вызов скопирован — отправьте его другу.');}catch{setShareStatus('Выделите и скопируйте текст ниже.');}
  };
  const toggleSound=()=>{const enabled=!preferences.sound;audio.setEnabled(enabled);setPreferences(p=>({...p,sound:enabled}));if(enabled)void audio.play('select');};
  const step=preferences.tutorialStep;
  return <div className={`layout quick-layout ${mobilePanelOpen?'sheet-open':''}`}>
    <header className="quick-topbar">
      <div><span className="map-eyebrow">ЕЖЕДНЕВНАЯ СТРАТЕГИЯ · {game.seed}</span><h1>Сферы влияния</h1><p>{realm.ruler} · {realm.name}</p></div>
      <div className="quick-resources"><span>◈ Влияние <strong key={`i${game.influence}`} className="resource-change">{game.influence}</strong><small>+{income} за ход</small></span><span>♡ Доверие <strong key={`t${game.trust}`} className="resource-change">{game.trust}%</strong><small>Усиливает кампании</small></span></div>
      <div className="quick-turn"><strong>Ход {game.turn}<span> / {QUICK_LIMIT}</span></strong><p>{game.actions} из 2 решений</p><button className={step===2?'tutorial-highlight':''} onClick={endTurn} disabled={!!game.result||turnAnimation||opening||selection}>Завершить ход →</button></div>
    </header>
    <nav className="session-toolbar" aria-label="Партия и настройки"><span className={saved?'save-indicator':'save-indicator unavailable'}>{saved?'✓ Партия сохранена на этом устройстве':'Не удалось сохранить: проверьте доступ к хранилищу браузера'}</span><div><button aria-pressed={preferences.sound} onClick={toggleSound}>{preferences.sound?'Звук: вкл':'Звук: выкл'}</button><button onClick={()=>setPreferences(p=>({...p,tutorialStep:0}))}>Подсказки</button><button onClick={()=>setSelection(true)}>Сменить правителя</button>{(game.seed!==today||challenge.goal||challenge.unsupported)&&<button onClick={()=>openMap(today)}>Карта на сегодня</button>}{game.result?<button onClick={()=>setResultOpen(true)}>Результат</button>:<button onClick={()=>setRestartOpen(true)}>Начать заново</button>}</div></nav>
    <div className="quick-goal"><span><strong>{cities}</strong> / {QUICK_GOAL} городов на вашей стороне</span><div className="quick-progress"><i style={{width:`${Math.min(100,cities/QUICK_GOAL*100)}%`}}/></div><button onClick={()=>setRules(r=>!r)}>{rules?'Скрыть':'Как играть'}</button></div>
    {challenge.unsupported&&<section className="challenge-banner"><strong>Этот вызов создан для другой версии правил.</strong><p>Текущую партию можно продолжить, но её результат не сравнивается с этим вызовом.</p></section>}
    {challenge.goal&&challenge.goal.seed===game.seed&&<section className="challenge-banner"><span className="map-eyebrow">ВЫЗОВ ДРУГА · ПРАВИЛА {RULESET_VERSION}</span><strong>Победите за {challenge.goal.turns} ходов или быстрее</strong><p>При равном ходе нужно больше {challenge.goal.trust}% доверия. {challenge.goal.player?`Держава для сравнения: ${REALMS[challenge.goal.player].name}.`:""} Карта и стартовые условия одинаковы.</p></section>}
    {step<3&&!game.result&&<section className="first-steps" aria-label="Подсказка первого запуска"><span className="step-number">{step+1} / 3</span><div><h2>{tutorial[step].title}</h2><p>{tutorial[step].text}</p></div><button onClick={()=>setPreferences(p=>({...p,tutorialStep:3}))}>Пропустить подсказки</button></section>}
    {rules&&<section className="panel quick-rules"><p>Вы играете за {realm.name}. {realm.privilege} {realm.drawback} Выберите город и примите два решения за ход. «Привлечь город» повышает вашу поддержку; город становится вашим, когда вы опережаете обоих соперников минимум на 5 пунктов.</p><p>Медиацентры в ваших городах дают доход. «Укрепить доверие» повышает поддержку и защищает город от ближайшего ответа соперников. Повторные кампании утомляют город — чередуйте их с укреплением доверия.</p><p>После хода две другие державы отвечают, вы получаете доход. Соберите поддержку 8 из 12 городов до конца 15-го хода. Это вымышленная игровая симуляция, а не руководство по реальному воздействию.</p></section>}
    {report.length>0&&<section className="turn-recap" aria-label="Ответ соперников"><div><span className="map-eyebrow">МИР ОТВЕТИЛ</span><strong>Ход {game.turn}</strong></div><ul>{report.map(line=><li key={line}>{line}</li>)}</ul><button aria-label="Скрыть ответ соперников" onClick={()=>setReport([])}>×</button></section>}
    <main className="main-grid quick-main">
      <div className={`map-frame ${step===0&&!game.result?'tutorial-map':''}`}><AssetBoundary fallback={<MapLoading regions={game.regions} onSelect={select} failed/>}><Suspense fallback={<MapLoading regions={game.regions} onSelect={select}/>}><WorldScene regions={game.regions} selectedRegionId={selectedId} onSelectRegion={select} onCaptureReady={captureReady} player={player} turn={game.turn} keyboardEnabled={!selection&&!opening&&!turnAnimation&&!rules&&!resultOpen&&!restartOpen}/></Suspense></AssetBoundary></div>
      <aside ref={cityPanel} className={`panel quick-city-panel ${mobilePanelOpen?'mobile-panel-open':''} ${step===1&&!game.result?'tutorial-highlight':''}`}><button className="city-panel-close" aria-label="Закрыть панель города" onClick={()=>setMobilePanelOpen(false)}>К карте ×</button><div className="city-switcher"><button aria-label="Предыдущий город" onClick={()=>cycleCity(-1)}>←</button><select aria-label="Выбрать город" value={selectedId} onChange={e=>select(e.target.value)}>{game.regions.map(r=><option key={r.id} value={r.id}>{r.infoController===player?"● ":""}{r.name}</option>)}</select><button aria-label="Следующий город" onClick={()=>cycleCity(1)}>→</button></div><span className="map-eyebrow">ВЫБРАННЫЙ ГОРОД</span><h2>{region.name}</h2><p className="quick-owner">{controller}</p><p className="climate-note">☀ {climateDescription(game.turn,game.regions.indexOf(region))}</p>
        <div className="quick-city-support"><span>Ваша поддержка <strong>{region.influence[game.player]}%</strong></span><div className="quick-progress"><i style={{width:`${region.influence[game.player]}%`}}/></div><p>{region.infoController===game.player?'Город на вашей стороне. Укрепляйте его поддержку.':needed===0?'Поддержка почти закреплена.':`До перехода: ещё ${needed} пунктов поддержки.`}</p></div>
        <div className="quick-city-notes"><span>{region.mediaNodes[game.player]>0?'◈ Медиацентр построен':'◈ Медиацентра нет'}</span><span>{region.factCheckShield[game.player]>0?'◇ Защита активна':'◇ Без защиты'}</span><span>Настроение: {region.fatigue>=35?'усталость':region.infoController===game.player?'доверие':'интерес'}</span></div>
        <div className="quick-actions">{(Object.keys(QUICK_ACTIONS) as QuickAction[]).map(action=>{const item=QUICK_ACTIONS[action],reason=actionError(game,region,action);return <article key={action}><div><h3>{item.name}</h3><span>◈ {actionCost(game,action)}</span></div><p>{action==='protect'?`+6 доверия, +${realm.protection} поддержки и защита от ответа соперников.`:item.description}</p><small>{action==='attract'?`Поддержка +${Math.min(100-region.influence[game.player],campaignGain(game,region))} · Доверие −${Math.min(realm.trustCost,game.trust)}`:action==='protect'?`Поддержка +${Math.min(realm.protection,100-region.influence[game.player])} · Доверие +${Math.min(6,100-game.trust)}`:item.effect}</small><button disabled={!!reason} title={reason??item.effect} onClick={()=>act(action)}>{reason??`${item.name} · ${actionCost(game,action)} влияния`}</button></article>;})}</div>
      </aside>
    </main>
    {mobilePanelOpen&&<button className="city-sheet-backdrop" aria-label="Вернуться к карте острова" onClick={()=>setMobilePanelOpen(false)}/>}
    <section className="panel quick-journal"><div className="panel-row"><h2>Последние события</h2><button onClick={share}>Поделиться вызовом</button></div><ul>{game.log.slice(0,4).map((entry,i)=><li key={`${i}-${entry}`}>{entry}</li>)}</ul>
      {shareText&&<div className="quick-share"><p role="status">{shareStatus}</p><textarea aria-label="Текст вызова" value={shareText} readOnly rows={4}/></div>}
      <form className="quick-code" onSubmit={event=>{event.preventDefault();if(/^[a-zA-Z0-9-]{1,40}$/.test(code))openMap(code);}}><label htmlFor="challenge-code">Код карты друга</label><input id="challenge-code" value={code} onChange={event=>setCode(event.target.value)} placeholder="Например, 2026-10-18" pattern="[a-zA-Z0-9-]{1,40}" maxLength={40} required/><button type="submit">Открыть карту</button></form>
    </section>
    {feedback&&<div key={feedback.id} className="action-feedback" role="status"><strong>{feedback.title}</strong><span>{feedback.detail}</span><button aria-label="Закрыть сообщение" onClick={()=>setFeedback(null)}>×</button></div>}
    {game.result&&resultOpen&&!turnAnimation&&<Modal titleId="quick-result" onClose={closeResult} className="result-with-card">{game.result==='win'&&<><Fireworks/><div className="victory-seal" aria-hidden="true">{realm.symbol}</div><p className="victory-ruler">{realm.ruler} · мир под вашей короной</p></>}<button className="modal-close" aria-label="Вернуться к карте" onClick={closeResult}>×</button><span className="map-eyebrow">КАРТА {game.seed}</span><h2 id="quick-result">{game.result==='win'?'Мир слушает вас':'Новая попытка — новая стратегия'}</h2><p>{cities} из 12 городов · Ход {game.turn} · Доверие {game.trust}%</p>{compareChallenge(game,challenge.goal)&&<p className="challenge-outcome">{compareChallenge(game,challenge.goal)}</p>}<AssetBoundary fallback={<p>Карточка временно недоступна. Скопируйте вызов кнопкой ниже или обновите страницу.</p>}><Suspense fallback={<p role="status">Рисуем вашу карточку…</p>}><ResultCard game={game} capture={capture}/></Suspense></AssetBoundary><div className="quick-result-buttons"><button onClick={share}>Скопировать вызов другу</button><button onClick={restart}>Та же карта заново</button><button onClick={closeResult}>К карте</button></div>{shareText&&<><p role="status">{shareStatus}</p><textarea aria-label="Текст результата" value={shareText} readOnly rows={4}/></>}</Modal>}
    {selection&&<RealmSelection initial={challenge.player??game.player} required={!boot.restored&&game.turn===1} onChoose={chooseRuler} onCancel={()=>setSelection(false)}/>}
    {opening&&<Opening faction={player} onDone={finishOpening}/>}
    {turnAnimation&&<TurnTransition turn={game.turn} faction={player} onDone={finishTurn}/>}
    {restartOpen&&<Modal titleId="restart-title" onClose={closeRestart}><h2 id="restart-title">Начать эту карту заново?</h2><p>Текущая попытка на карте {game.seed} будет заменена новой. Остальные карты сохранятся.</p><div className="quick-result-buttons"><button onClick={closeRestart}>Продолжить партию</button><button onClick={restart}>Начать заново</button></div></Modal>}
  </div>;
}
