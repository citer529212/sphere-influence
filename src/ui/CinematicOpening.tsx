import { useCallback, useEffect, useRef, useState } from "react";
import { FactionId } from "../game/types";
import { REALMS } from "../game/realms";
import { Modal } from "./Modal";
import { INTRO_MOVIES, INTRO_POSTER, openingChapter } from "./cinematicAssets";

export function CinematicOpening({
  faction,
  sound,
  onSoundChange,
  onDone,
  onUnavailable,
}: {
  faction: FactionId;
  sound: boolean;
  onSoundChange: (enabled: boolean) => void;
  onDone: () => void;
  onUnavailable: () => void;
}): JSX.Element {
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
    onDoneRef.current();
  }, []);
  const play = () => {
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
        setWaiting(false);
      });
  };
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!reduced) play();
    const visibility = () => {
      if (document.hidden) element.pause();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
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
        src={INTRO_MOVIES[faction]}
        poster={INTRO_POSTER}
        preload="metadata"
        playsInline
        muted={!sound}
        disablePictureInPicture
        aria-label={`Вступление: встреча правителей, разрыв карты и ${REALMS[faction].name}`}
        onTimeUpdate={(event) =>
          setChapter(openingChapter(event.currentTarget.currentTime))
        }
        onPlaying={() => {
          setPaused(false);
          setWaiting(false);
        }}
        onPause={() => setPaused(true)}
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
          aria-label="Воспроизвести вступление"
        >
          ▶ <span>{reduced ? "Смотреть вступление" : "Воспроизвести"}</span>
        </button>
      )}
      {waiting && !paused && (
        <p className="cinematic-loading" role="status">
          Загружаем видео…
        </p>
      )}
      <div className="cinematic-bottom">
        <p className="cinematic-chapters" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <i key={i} className={chapter === i ? "active" : ""} />
          ))}
        </p>
        <h2 id="cinematic-title">{captions[chapter]}</h2>
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
          <button
            aria-pressed={sound}
            onClick={() => {
              if (video.current) video.current.muted = sound;
              onSoundChange(!sound);
            }}
          >
            {sound ? "Звук: вкл" : "Звук: выкл"}
          </button>
          <button onClick={finish}>К правилам →</button>
        </div>
      </div>
    </Modal>
  );
}
