import { useCallback, useEffect, useRef, useState } from "react";
import { playVideo,videoFinished } from "./mediaPlayback";
import { compactDevice,deviceHints } from '../device';
import { MOBILE_INTRO_MOVIES,MOBILE_VICTORY_MOVIES } from './mobileCinematicAssets';
import { FactionId } from "../game/types";
import { REALMS } from "../game/realms";
import { Modal } from "./Modal";
import {
  INTRO_MOVIES,
  INTRO_POSTER,
  VICTORY_MOVIES,
  VICTORY_POSTERS,
  openingChapter,
} from "./cinematicAssets";

export function CinematicOpening({
  faction,
  sound,
  onSoundChange,
  onDone,
  onUnavailable,
  variant = "opening",
  beforePlay,
  onPlaybackChange,
  onMusic,
  covered=false,
  autoPlayAllowed=true,
}: {
  covered?:boolean;
  autoPlayAllowed?:boolean;
  variant?: "opening" | "victory";
  beforePlay?:()=>Promise<void>;
  onPlaybackChange?:(playing:boolean)=>void;
  onMusic?:()=>void;
  faction: FactionId;
  sound: boolean;
  onSoundChange: (enabled: boolean) => void;
  onDone: () => void;
  onUnavailable: () => void;
}): JSX.Element {
  const victory = variant === "victory";
  const [mobile]=useState(()=>compactDevice(deviceHints()));
  const [standard,setStandard]=useState(false),[failed,setFailed]=useState(false),[slow,setSlow]=useState(false);
  const failedRef=useRef(false);
  const wantsPlay=useRef(false),coveredRef=useRef(covered);coveredRef.current=covered;
  const video = useRef<HTMLVideoElement>(null),
    done = useRef(false),
    onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [paused, setPaused] = useState(true),
    [waiting, setWaiting] = useState(false),
    [chapter, setChapter] = useState<0 | 1 | 2>(0);
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    video.current?.pause();
    onPlaybackChange?.(false);
    onDoneRef.current();
  }, []);
  const preparing=useRef(false),lifecycle=useRef(0),attempt=useRef(0);
  const play = (manual=false) => {
    if((preparing.current&&!manual)||done.current||coveredRef.current||document.hidden||(failedRef.current&&!manual))return;
    const element=video.current;if(!element)return;
    const epoch=lifecycle.current,ticket=++attempt.current;
    const current=()=>epoch===lifecycle.current&&ticket===attempt.current&&!done.current&&!coveredRef.current&&!document.hidden;
    wantsPlay.current=true;preparing.current=true;setWaiting(true);setSlow(false);
    void playVideo(element,beforePlay,current,manual).then(()=>{if(!current())return;preparing.current=false;setPaused(element.paused);setWaiting(false);}).catch(()=>{if(!current())return;preparing.current=false;setPaused(true);if(!failedRef.current)onPlaybackChange?.(false);setWaiting(false);});
  };
  useEffect(() => {
    const element=video.current;if(!element)return;
    lifecycle.current++;done.current=false;preparing.current=false;wantsPlay.current=!reduced&&autoPlayAllowed;
    if(!autoPlayAllowed&&beforePlay)void beforePlay().catch(()=>undefined);
    if(!reduced&&autoPlayAllowed&&!coveredRef.current)play();
    const visibility=()=>{if(document.hidden){attempt.current++;preparing.current=false;setWaiting(false);element.pause();}else if(wantsPlay.current&&!coveredRef.current&&element.paused&&!element.ended&&!done.current)play();};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('focus',visibility);window.addEventListener('pageshow',visibility);
    return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',visibility);window.removeEventListener('pageshow',visibility);lifecycle.current++;attempt.current++;done.current=true;preparing.current=false;element.pause();};
  },[faction,reduced]);
  useEffect(()=>{if(covered){attempt.current++;preparing.current=false;setWaiting(false);video.current?.pause();}else if(wantsPlay.current&&!document.hidden&&video.current?.paused&&!video.current.ended&&!done.current)play();},[covered]);
  useEffect(()=>{if(!waiting||failed)return;const timer=setTimeout(()=>setSlow(true),12000);return()=>clearTimeout(timer);},[waiting,failed]);
  const captions = [
    "Три короны спорили о будущем мира…",
    "Карта разделена. Борьба за доверие только начинается.",
    `${REALMS[faction].ruler}, пусть мир услышит вашу державу.`,
  ];
  return (
    <Modal
      titleId="cinematic-title"
      onClose={finish}
      className="cinematic-player"
    >
      <video
        ref={video}
        src={victory ? (mobile&&!standard?MOBILE_VICTORY_MOVIES:VICTORY_MOVIES)[faction] : (mobile&&!standard?MOBILE_INTRO_MOVIES:INTRO_MOVIES)[faction]}
        poster={victory ? VICTORY_POSTERS[faction] : INTRO_POSTER}
        preload="metadata"
        playsInline
        muted={victory || !sound}
        disablePictureInPicture
        aria-label={
          victory
            ? `Победа: ${REALMS[faction].name}`
            : `Вступление: встреча правителей, разрыв карты и ${REALMS[faction].name}`
        }
        onTimeUpdate={(event) =>
          setChapter(openingChapter(event.currentTarget.currentTime))
        }
        onPlaying={() => {
          onPlaybackChange?.(true);
          setPaused(false);
          setWaiting(false);
        }}
        onPause={() => {setPaused(true);if(!failedRef.current&&!coveredRef.current)onPlaybackChange?.(false);}}
        onWaiting={() => setWaiting(true)}
        onEnded={event=>{if(videoFinished(event.currentTarget.currentTime,event.currentTarget.duration))finish();}}
        onError={() => {
          if(done.current)return;
          if(mobile&&!standard){setStandard(true);return;}
          if(victory){attempt.current++;preparing.current=false;failedRef.current=true;setFailed(true);setWaiting(false);onPlaybackChange?.(true);}
          else onUnavailable();
        }}
        onLoadedData={()=>{if(wantsPlay.current&&!reduced&&!done.current)play();}}
      />
      {failed&&<div className="victory-recovery" role="status">
        <div className="victory-sparks" aria-hidden="true">✦ ✧ ✦<br/>✧ ⚑ ✧<br/>✦ ✧ ✦</div>
        <h2>Победа {REALMS[faction].name}!</h2>
        <p>Мир слушает вашу державу. Видео не загрузилось, но победа сохранена.</p>
        <button onClick={()=>{failedRef.current=false;setFailed(false);setStandard(true);video.current?.load();play(true);}}>Повторить видео</button>
      </div>}
      <div className="cinematic-top">
        <span>СФЕРЫ ВЛИЯНИЯ · {REALMS[faction].name}</span>
        <button onClick={finish}>Пропустить →</button>
      </div>
      {paused && !failed && (
        <button
          className="cinematic-play"
          onClick={()=>play(true)}
          data-autofocus
          aria-label={
            victory
              ? "Воспроизвести победный ролик"
              : "Воспроизвести вступление"
          }
        >
          ▶{" "}
          <span>
            {reduced
              ? victory
                ? "Смотреть победу"
                : "Смотреть вступление"
              : "Воспроизвести"}
          </span>
        </button>
      )}
      {waiting && !failed && (
        <p className="cinematic-loading" role="status">
          {slow?<>Загрузка задерживается. <button onClick={()=>{video.current?.load();play(true);}}>Повторить запуск</button></>:"Загружаем видео…"}
        </p>
      )}
      <div className="cinematic-bottom">
        {!victory && (
          <p className="cinematic-chapters" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <i key={i} className={chapter === i ? "active" : ""} />
            ))}
          </p>
        )}
        <h2 id="cinematic-title">
          {victory
            ? `${REALMS[faction].ruler} · Мир слушает вас`
            : captions[chapter]}
        </h2>
        <div className="cinematic-controls">
          <button
            onClick={() => {
              if (paused) play(true);
              else {wantsPlay.current=false;video.current?.pause();}
            }}
            aria-label={paused ? "Продолжить видео" : "Пауза"}
          >
            {paused ? "▶ Продолжить" : "Ⅱ Пауза"}
          </button>
          {!victory && (
            <button
              aria-pressed={sound}
              onClick={() => {
                if (video.current) video.current.muted = sound;
                onSoundChange(!sound);
              }}
            >
              {sound ? "Звук: вкл" : "Звук: выкл"}
            </button>
          )}
          {onMusic && <button onClick={onMusic}>Музыка</button>}
          <button onClick={finish}>
            {victory ? "К итогам партии →" : "К правилам →"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
