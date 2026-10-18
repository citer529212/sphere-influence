import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MapLoading } from './components/MapLoading';
import { AssetBoundary } from './ui/AssetBoundary';
import { FACTIONS } from './game/data';
import { actionError, campaignGain, controlled, createQuickGame, dailySeed, QUICK_ACTIONS, QUICK_GOAL, QUICK_LIMIT, quickAction, quickEndTurn, QuickAction, QuickState, RULESET_VERSION, supportLead } from './game/quickGame';
import { browserStorage, loadPreferences, Preferences, savePreferences, saveSession, startSession } from './game/session';
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
  return (['meridian','concordat'] as const).map(faction=>{
    const target=after.regions.find((r,i)=>r.influence[faction]>before.regions[i].influence[faction]);
    if(!target)return `${FACTIONS[faction].name}: нового влияния не получили.`;
    const old=before.regions.find(r=>r.id===target.id)!;
    return `${FACTIONS[faction].name}: «${target.name}», поддержка +${target.influence[faction]-old.influence[faction]}${old.infoController==='atlas'&&target.infoController!=='atlas'?' — ваш контроль ослаб':''}.`;
  });
}
export default function App():JSX.Element {
  const [boot]=useState(()=>{
    const storage=browserStorage(),challenge=parseSharedChallenge(window.location.search);
    return {storage,challenge,...startSession(storage,challenge.unsupported?undefined:challenge.seed),preferences:loadPreferences(storage)};
  });
  const [game,setGame]=useState(boot.session.game),[selectedId,setSelectedId]=useState(boot.session.selectedId);
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
  useEffect(()=>{setSaved(saveSession(boot.storage,game,selectedId));},[boot.storage,game,selectedId]);
  useEffect(()=>{savePreferences(boot.storage,preferences);audio.setEnabled(preferences.sound);},[boot.storage,preferences,audio]);
  useEffect(()=>()=>audio.dispose(),[audio]);
  useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(null),4800);return()=>clearTimeout(timer);},[feedback]);
  useEffect(()=>{if(mobilePanelOpen)cityPanel.current?.querySelector<HTMLButtonElement>('.city-panel-close')?.focus();},[mobilePanelOpen,selectedId]);
  const region=game.regions.find(r=>r.id===selectedId)??game.regions[0];
  const cities=controlled(game),today=dailySeed();
  const income=4+game.regions.filter(r=>r.infoController==='atlas'&&r.mediaNodes.atlas>0).length;
  const controller=region.infoController==='contested'?'Город колеблется':FACTIONS[region.infoController].name;
  const needed=Math.max(0,supportLead(region)+5-region.influence.atlas);
  const notify=(title:string,detail:string)=>setFeedback({id:Date.now(),title,detail});
  const select=(id:string)=>{
    setSelectedId(id);setMobilePanelOpen(window.matchMedia('(max-width:1100px)').matches);void audio.play('select');
    setPreferences(p=>p.tutorialStep===0?{...p,tutorialStep:1}:p);
  };
  const act=(action:QuickAction)=>{
    const next=quickAction(game,region.id,action);if(next===game)return;
    const updated=next.regions.find(r=>r.id===region.id)!;
    const gained=updated.influence.atlas-region.influence.atlas;
    const captured=region.infoController!=='atlas'&&updated.infoController==='atlas';
    const trust=next.trust-game.trust;
    notify(captured?`${region.name} — на вашей стороне`:QUICK_ACTIONS[action].name,
      `${gained?`Поддержка +${gained} · `:''}${trust?`Доверие ${trust>0?'+':''}${trust} · `:''}Влияние −${QUICK_ACTIONS[action].cost}${action==='media'?' · Доход +1 за ход':''}`);
    setGame(next);setReport([]);
    setPreferences(p=>p.tutorialStep===1?{...p,tutorialStep:2}:p);
    void audio.play(next.result==='win'?'win':captured?'capture':action);
    if(next.result)setResultOpen(true);
  };
  const endTurn=()=>{
    const next=quickEndTurn(game);if(next===game)return;
    setReport(opponentReport(game,next));setGame(next);
    notify(next.result?'Партия завершена':`Ход ${next.turn} — ваш ход`,`Влияние +${next.influence-game.influence} · Города: ${controlled(next)} / 12`);
    setPreferences(p=>p.tutorialStep===2?{...p,tutorialStep:3}:p);
    void audio.play(next.result==='loss'?'loss':next.result==='win'?'win':'turn');
    if(next.result)setResultOpen(true);
  };
  const openMap=(seed:string)=>{
    const opened=startSession(boot.storage,seed);setGame(opened.session.game);setSelectedId(opened.session.selectedId);setShareText('');setShareStatus('');setReport([]);setResultOpen(!!opened.session.game.result);
    setChallenge({seed,goal:null,unsupported:false});setMobilePanelOpen(false);
    const url=new URL(window.location.href);url.search='';url.searchParams.set('challenge',seed);url.searchParams.set('rules',RULESET_VERSION);window.history.replaceState({},'',url);
    notify(opened.restored?'Партия восстановлена':'Карта открыта',`Код ${seed} · ход ${opened.session.game.turn}`);
  };
  const restart=()=>{
    const fresh=createQuickGame(game.seed);setGame(fresh);setSelectedId(fresh.regions[0].id);setShareText('');setShareStatus('');setReport([]);setResultOpen(false);setRestartOpen(false);setMobilePanelOpen(false);
    notify('Новая попытка',`Карта ${game.seed}. Найдите свой путь к восьми городам.`);
  };
  const share=async()=>{
    const text=challengeText(window.location.href,game);
    setShareText(text);
    try{await navigator.clipboard.writeText(text);setShareStatus('Вызов скопирован — отправьте его другу.');}catch{setShareStatus('Выделите и скопируйте текст ниже.');}
  };
  const toggleSound=()=>{const enabled=!preferences.sound;audio.setEnabled(enabled);setPreferences(p=>({...p,sound:enabled}));if(enabled)void audio.play('select');};
  const step=preferences.tutorialStep;
  return <div className={`layout quick-layout ${mobilePanelOpen?'sheet-open':''}`}>
    <header className="quick-topbar">
      <div><span className="map-eyebrow">ЕЖЕДНЕВНАЯ СТРАТЕГИЯ · {game.seed}</span><h1>Сферы влияния</h1><p>Привлеките 8 городов за 15 ходов</p></div>
      <div className="quick-resources"><span>◈ Влияние <strong key={`i${game.influence}`} className="resource-change">{game.influence}</strong><small>+{income} за ход</small></span><span>♡ Доверие <strong key={`t${game.trust}`} className="resource-change">{game.trust}%</strong><small>Усиливает кампании</small></span></div>
      <div className="quick-turn"><strong>Ход {game.turn}<span> / {QUICK_LIMIT}</span></strong><p>{game.actions} из 2 решений</p><button className={step===2?'tutorial-highlight':''} onClick={endTurn} disabled={!!game.result}>Завершить ход →</button></div>
    </header>
    <nav className="session-toolbar" aria-label="Партия и настройки"><span className={saved?'save-indicator':'save-indicator unavailable'}>{saved?'✓ Партия сохранена на этом устройстве':'Не удалось сохранить: проверьте доступ к хранилищу браузера'}</span><div><button aria-pressed={preferences.sound} onClick={toggleSound}>{preferences.sound?'Звук: вкл':'Звук: выкл'}</button><button onClick={()=>setPreferences(p=>({...p,tutorialStep:0}))}>Подсказки</button>{(game.seed!==today||challenge.goal||challenge.unsupported)&&<button onClick={()=>openMap(today)}>Карта на сегодня</button>}{game.result?<button onClick={()=>setResultOpen(true)}>Результат</button>:<button onClick={()=>setRestartOpen(true)}>Начать заново</button>}</div></nav>
    <div className="quick-goal"><span><strong>{cities}</strong> / {QUICK_GOAL} городов на вашей стороне</span><div className="quick-progress"><i style={{width:`${Math.min(100,cities/QUICK_GOAL*100)}%`}}/></div><button onClick={()=>setRules(r=>!r)}>{rules?'Скрыть':'Как играть'}</button></div>
    {challenge.unsupported&&<section className="challenge-banner"><strong>Этот вызов создан для другой версии правил.</strong><p>Текущую партию можно продолжить, но её результат не сравнивается с этим вызовом.</p></section>}
    {challenge.goal&&challenge.goal.seed===game.seed&&<section className="challenge-banner"><span className="map-eyebrow">ВЫЗОВ ДРУГА · ПРАВИЛА {RULESET_VERSION}</span><strong>Победите за {challenge.goal.turns} ходов или быстрее</strong><p>При равном ходе нужно больше {challenge.goal.trust}% доверия. Карта и стартовые условия одинаковы.</p></section>}
    {step<3&&!game.result&&<section className="first-steps" aria-label="Подсказка первого запуска"><span className="step-number">{step+1} / 3</span><div><h2>{tutorial[step].title}</h2><p>{tutorial[step].text}</p></div><button onClick={()=>setPreferences(p=>({...p,tutorialStep:3}))}>Пропустить подсказки</button></section>}
    {rules&&<section className="panel quick-rules"><p>Вы играете за Синий Атлас. Выберите город и примите два решения за ход. «Привлечь город» повышает вашу поддержку; город становится вашим, когда вы опережаете обоих соперников минимум на 5 пунктов.</p><p>Медиацентры в ваших городах дают доход. «Укрепить доверие» повышает поддержку и защищает город от ближайшего ответа соперников. Повторные кампании утомляют город — чередуйте их с укреплением доверия.</p><p>После хода две другие державы отвечают, вы получаете доход. Соберите поддержку 8 из 12 городов до конца 15-го хода. Это вымышленная игровая симуляция, а не руководство по реальному воздействию.</p></section>}
    {report.length>0&&<section className="turn-recap" aria-label="Ответ соперников"><div><span className="map-eyebrow">МИР ОТВЕТИЛ</span><strong>Ход {game.turn}</strong></div><ul>{report.map(line=><li key={line}>{line}</li>)}</ul><button aria-label="Скрыть ответ соперников" onClick={()=>setReport([])}>×</button></section>}
    <main className="main-grid quick-main">
      <div className={`map-frame ${step===0&&!game.result?'tutorial-map':''}`}><AssetBoundary fallback={<MapLoading regions={game.regions} onSelect={select} failed/>}><Suspense fallback={<MapLoading regions={game.regions} onSelect={select}/>}><WorldScene regions={game.regions} selectedRegionId={selectedId} onSelectRegion={select} onCaptureReady={captureReady}/></Suspense></AssetBoundary></div>
      <aside ref={cityPanel} className={`panel quick-city-panel ${mobilePanelOpen?'mobile-panel-open':''} ${step===1&&!game.result?'tutorial-highlight':''}`}><button className="city-panel-close" aria-label="Закрыть панель города" onClick={()=>setMobilePanelOpen(false)}>К карте ×</button><span className="map-eyebrow">ВЫБРАННЫЙ ГОРОД</span><h2>{region.name}</h2><p className="quick-owner">{controller}</p>
        <div className="quick-city-support"><span>Ваша поддержка <strong>{region.influence.atlas}%</strong></span><div className="quick-progress"><i style={{width:`${region.influence.atlas}%`}}/></div><p>{region.infoController==='atlas'?'Город на вашей стороне. Укрепляйте его поддержку.':needed===0?'Поддержка почти закреплена.':`До перехода: ещё ${needed} пунктов поддержки.`}</p></div>
        <div className="quick-city-notes"><span>{region.mediaNodes.atlas>0?'◈ Медиацентр построен':'◈ Медиацентра нет'}</span><span>{region.factCheckShield.atlas>0?'◇ Защита активна':'◇ Без защиты'}</span><span>Настроение: {region.fatigue>=35?'усталость':region.infoController==='atlas'?'доверие':'интерес'}</span></div>
        <div className="quick-actions">{(Object.keys(QUICK_ACTIONS) as QuickAction[]).map(action=>{const item=QUICK_ACTIONS[action],reason=actionError(game,region,action);return <article key={action}><div><h3>{item.name}</h3><span>◈ {item.cost}</span></div><p>{item.description}</p><small>{action==='attract'?`Поддержка +${Math.min(100-region.influence.atlas,campaignGain(game,region))} · Доверие −${Math.min(3,game.trust)}`:action==='protect'?`Поддержка +${Math.min(10,100-region.influence.atlas)} · Доверие +${Math.min(6,100-game.trust)}`:item.effect}</small><button disabled={!!reason} title={reason??item.effect} onClick={()=>act(action)}>{reason??`${item.name} · ${item.cost} влияния`}</button></article>;})}</div>
      </aside>
    </main>
    {mobilePanelOpen&&<button className="city-sheet-backdrop" aria-label="Вернуться к карте острова" onClick={()=>setMobilePanelOpen(false)}/>}
    <section className="panel quick-journal"><div className="panel-row"><h2>Последние события</h2><button onClick={share}>Поделиться вызовом</button></div><ul>{game.log.slice(0,4).map((entry,i)=><li key={`${i}-${entry}`}>{entry}</li>)}</ul>
      {shareText&&<div className="quick-share"><p role="status">{shareStatus}</p><textarea aria-label="Текст вызова" value={shareText} readOnly rows={4}/></div>}
      <form className="quick-code" onSubmit={event=>{event.preventDefault();if(/^[a-zA-Z0-9-]{1,40}$/.test(code))openMap(code);}}><label htmlFor="challenge-code">Код карты друга</label><input id="challenge-code" value={code} onChange={event=>setCode(event.target.value)} placeholder="Например, 2026-10-18" pattern="[a-zA-Z0-9-]{1,40}" maxLength={40} required/><button type="submit">Открыть карту</button></form>
    </section>
    {feedback&&<div key={feedback.id} className="action-feedback" role="status"><strong>{feedback.title}</strong><span>{feedback.detail}</span><button aria-label="Закрыть сообщение" onClick={()=>setFeedback(null)}>×</button></div>}
    {game.result&&resultOpen&&<Modal titleId="quick-result" onClose={closeResult} className="result-with-card"><button className="modal-close" aria-label="Вернуться к карте" onClick={closeResult}>×</button><span className="map-eyebrow">КАРТА {game.seed}</span><h2 id="quick-result">{game.result==='win'?'Мир слушает вас':'Новая попытка — новая стратегия'}</h2><p>{cities} из 12 городов · Ход {game.turn} · Доверие {game.trust}%</p>{compareChallenge(game,challenge.goal)&&<p className="challenge-outcome">{compareChallenge(game,challenge.goal)}</p>}<AssetBoundary fallback={<p>Карточка временно недоступна. Скопируйте вызов кнопкой ниже или обновите страницу.</p>}><Suspense fallback={<p role="status">Рисуем вашу карточку…</p>}><ResultCard game={game} capture={capture}/></Suspense></AssetBoundary><div className="quick-result-buttons"><button onClick={share}>Скопировать вызов другу</button><button onClick={restart}>Та же карта заново</button><button onClick={closeResult}>К карте</button></div>{shareText&&<><p role="status">{shareStatus}</p><textarea aria-label="Текст результата" value={shareText} readOnly rows={4}/></>}</Modal>}
    {restartOpen&&<Modal titleId="restart-title" onClose={closeRestart}><h2 id="restart-title">Начать эту карту заново?</h2><p>Текущая попытка на карте {game.seed} будет заменена новой. Остальные карты сохранятся.</p><div className="quick-result-buttons"><button onClick={closeRestart}>Продолжить партию</button><button onClick={restart}>Начать заново</button></div></Modal>}
  </div>;
}
