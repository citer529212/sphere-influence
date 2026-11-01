import { useCallback, useEffect, useRef, useState } from "react";
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
}: {
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
  const preparing=useRef(false),lifecycle=useRef(0);
  const play = async () => {
    if(preparing.current||done.current)return;
    const epoch=lifecycle.current;
    preparing.current=true;
    if(beforePlay) await Promise.race([beforePlay().catch(()=>undefined),new Promise(resolve=>setTimeout(resolve,2000))]);
    if(epoch!==lifecycle.current||done.current)return;
    preparing.current=false;
    const element = video.current;
    if (!element) return;
    setWaiting(true);
    void element
      .play()
      .then(() => {
        setPaused(false);
        setWaiting(false);
      })
      .catch(() => {
        setPaused(true);
        onPlaybackChange?.(false);
        setWaiting(false);
      });
  };
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    lifecycle.current++;done.current=false;preparing.current=false;
    if (!reduced) void play();
    const visibility = () => {
      if (document.hidden) element.pause();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      lifecycle.current++;done.current=true;preparing.current=false;
      element.pause();
    };
  }, [faction, reduced]);
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
        src={victory ? VICTORY_MOVIES[faction] : INTRO_MOVIES[faction]}
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
        onPause={() => {setPaused(true);onPlaybackChange?.(false);}}
        onWaiting={() => setWaiting(true)}
        onEnded={finish}
        onError={() => {
          if (!done.current) onUnavailable();
        }}
      />
      <div className="cinematic-top">
        <span>СФЕРЫ ВЛИЯНИЯ · {REALMS[faction].name}</span>
        <button onClick={finish}>Пропустить →</button>
      </div>
      {paused && (
        <button
          className="cinematic-play"
          onClick={play}
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
      {waiting && !paused && (
        <p className="cinematic-loading" role="status">
          Загружаем видео…
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
              if (paused) play();
              else video.current?.pause();
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
