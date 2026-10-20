import { useEffect, useState, useRef } from "react";
import { FACTION_IDS, REALMS } from "../game/realms";
import { DIFFICULTIES, DifficultyId } from "../game/information";
import { FactionId } from "../game/types";
function useDialogFocus(onEscape?: () => void) {
  const escape = useRef(onEscape);
  escape.current = onEscape;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      ref.current?.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"]',
      ) ?? ref.current?.querySelector<HTMLButtonElement>("button")
    )?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escape.current) {
        e.preventDefault();
        escape.current();
        return;
      }
      if (e.key !== "Tab") return;
      const buttons = Array.from(
        ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
      );
      if (!buttons.length) return;
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap);
      old?.focus();
    };
  }, []);
  return ref;
}
export function RulerPortrait({
  faction,
}: {
  faction: FactionId;
}): JSX.Element {
  const r = REALMS[faction];
  return (
    <svg
      className={`ruler-portrait ruler-${faction}`}
      viewBox="0 0 200 230"
      role="img"
      aria-label={r.ruler}
    >
      <defs>
        <radialGradient id={`halo-${faction}`}>
          <stop stopColor={r.color} stopOpacity=".45" />
          <stop offset="1" stopColor={r.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="103" r="95" fill={`url(#halo-${faction})`} />
      <path d="M24 230Q24 161 76 160L124 160Q176 161 176 230" fill={r.color} />
      <path d="M77 157L100 202L124 157L116 151L84 151Z" fill="#ead9b5" />
      <path
        d="M59 103Q50 45 100 43Q153 44 141 112L130 156L70 156Z"
        fill={faction === "concordat" ? "#30211e" : "#44352e"}
      />
      <ellipse
        cx="100"
        cy="109"
        rx="34"
        ry="45"
        fill={
          faction === "concordat"
            ? "#835136"
            : faction === "meridian"
              ? "#cca075"
              : "#f0cfb2"
        }
      />
      <path
        d="M65 95Q65 56 102 61Q138 61 135 94Q115 85 103 71Q84 91 65 95"
        fill={faction === "atlas" ? "#57443b" : "#26221f"}
      />
      <path
        d="M70 62L64 33L85 45L100 23L115 45L136 33L130 62Z"
        fill="#e6c16a"
        stroke="#fff0bb"
        strokeWidth="2"
      />
      <circle cx="100" cy="48" r="5" fill={r.color} />
      <path
        d="M78 105L88 104M112 104L122 105"
        stroke="#342822"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M91 132Q100 137 109 132"
        fill="none"
        stroke="#7d4037"
        strokeWidth="2"
      />
      <path d="M100 109L96 121L102 123" fill="none" stroke="#a16c50" />
      <path
        d="M47 230L58 177L100 215L143 177L155 230"
        fill="#101f2a"
        opacity=".5"
      />
      <circle cx="100" cy="207" r="7" fill="#e8c978" />
      {faction === "atlas" && (
        <path
          d="M65 75Q42 113 64 152M135 75Q158 113 136 152"
          fill="none"
          stroke="#d7d0c4"
          strokeWidth="9"
        />
      )}
      {faction === "meridian" && (
        <path d="M83 138Q100 166 117 138L109 166L91 166Z" fill="#272220" />
      )}
      {faction === "concordat" && (
        <>
          <circle
            cx="63"
            cy="122"
            r="8"
            fill="none"
            stroke="#eac75c"
            strokeWidth="4"
          />
          <circle
            cx="137"
            cy="122"
            r="8"
            fill="none"
            stroke="#eac75c"
            strokeWidth="4"
          />
        </>
      )}
    </svg>
  );
}
export function RealmSelection({
  onChoose,
  onCancel,
  required,
  initial,
  initialDifficulty,
}: {
  initialDifficulty: DifficultyId;
  initial: FactionId;
  onChoose: (f: FactionId, d: DifficultyId) => void;
  onCancel: () => void;
  required: boolean;
}): JSX.Element {
  const [chosen, setChosen] = useState<FactionId>(initial),
    [difficulty, setDifficulty] = useState<DifficultyId>(initialDifficulty),
    dialog = useDialogFocus(required ? undefined : onCancel);
  return (
    <div
      ref={dialog}
      className="realm-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="realm-title"
    >
      <div className="realm-heading">
        <span className="map-eyebrow">ТРИ КОРОНЫ · ОДИН МИР</span>
        <h1 id="realm-title">Кто поведёт вашу державу?</h1>
        <p>
          Борьба редакций, доверия и общественных повесток. Политические границы
          сохраняются.
        </p>
      </div>
      <div className="difficulty-selector" role="group" aria-label="Сложность">
        {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => (
          <button
            key={id}
            aria-pressed={id === difficulty}
            onClick={() => setDifficulty(id)}
          >
            <strong>{DIFFICULTIES[id].name}</strong>
            <span>
              {DIFFICULTIES[id].goal} городов · {DIFFICULTIES[id].limit}{" "}
              {id === "standard" ? "хода" : "ходов"}
            </span>
            <small>{DIFFICULTIES[id].description}</small>
          </button>
        ))}
      </div>
      <p className="difficulty-goal">
        Для победы: лидерство в {DIFFICULTIES[difficulty].goal} городах ·
        доверие от {DIFFICULTIES[difficulty].trust}% · удержание{" "}
        {DIFFICULTIES[difficulty].hold}{" "}
        {DIFFICULTIES[difficulty].hold === 1 ? "ход" : "хода"}
      </p>
      <div className="realm-cards">
        {FACTION_IDS.map((f) => {
          const r = REALMS[f];
          return (
            <button
              key={f}
              className={`realm-card ${chosen === f ? "chosen" : ""}`}
              style={{ "--realm-color": r.color } as React.CSSProperties}
              aria-pressed={chosen === f}
              onClick={() => setChosen(f)}
            >
              <RulerPortrait faction={f} />
              <span className="map-eyebrow">{r.title}</span>
              <h2>{r.ruler}</h2>
              <strong>{r.name}</strong>
              <p>{r.culture}</p>
              <blockquote>{r.quote}</blockquote>
              <div className="realm-perk">+ {r.privilege}</div>
              <div className="realm-flaw">− {r.drawback}</div>
            </button>
          );
        })}
      </div>
      <div className="realm-start">
        <button onClick={() => onChoose(chosen, difficulty)}>
          Начать: {REALMS[chosen].name} →
        </button>
        {!required && <button onClick={onCancel}>Вернуться в партию</button>}
        <small>Новая попытка сохраняется отдельно для каждой сложности.</small>
      </div>
    </div>
  );
}
export function Opening({
  faction,
  onDone,
}: {
  faction: FactionId;
  onDone: () => void;
}): JSX.Element {
  const [beat, setBeat] = useState(0),
    dialog = useDialogFocus(onDone);
  useEffect(() => {
    const timers = [
      setTimeout(() => setBeat(1), 2600),
      setTimeout(() => setBeat(2), 5200),
      setTimeout(onDone, 8200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);
  return (
    <div
      ref={dialog}
      className={`opening beat-${beat}`}
      role="dialog"
      aria-modal="true"
      aria-label="Вступление: расколотый атлас"
    >
      <span className="map-eyebrow">ЛЕТОПИСЬ ТРЁХ КОРОН</span>
      <div className="council">
        {FACTION_IDS.map((f) => (
          <div
            key={f}
            className={`council-ruler ${f === faction ? "your-ruler" : ""}`}
          >
            <RulerPortrait faction={f} />
            <strong>{REALMS[f].ruler}</strong>
            <p>
              {f === "atlas"
                ? "«Морские пути — под защитой Атласа!»"
                : f === "meridian"
                  ? "«Мир удержит только единая корона!»"
                  : "«Вы не решите судьбу общин без нас!»"}
            </p>
          </div>
        ))}
      </div>
      <div className="torn-map">
        {[...FACTION_IDS, "neutral" as const].map((f) => (
          <div
            key={f}
            className={`map-shard shard-${f} ${f === faction ? "chosen-shard" : ""}`}
          >
            <img
              src={`./continent-${f}.svg`}
              alt={f === "neutral" ? "Нейтральные острова" : REALMS[f].name}
            />
          </div>
        ))}
      </div>
      <h2>
        {beat === 0
          ? "Три короны спорили о будущем мира…"
          : beat === 1
            ? "Материки разошлись. Свободные острова остались между ними."
            : "Ваша история начинается на одном из его осколков."}
      </h2>
      <p>
        {beat === 2
          ? `${REALMS[faction].ruler}, заслужите внимание и доверие этого мира.`
          : "«Мир нельзя поделить навечно». Но каждый решил попробовать."}
      </p>
      <button onClick={onDone}>Перейти к своей державе →</button>
    </div>
  );
}
export function TurnTransition({
  turn,
  faction,
  onDone,
}: {
  turn: number;
  faction: FactionId;
  onDone: () => void;
}): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDone, 1450);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="turn-transition" role="status">
      <div className="turn-orbit">
        <span>{REALMS[faction].symbol}</span>
      </div>
      <span className="map-eyebrow">ЛЕТОПИСЬ ПРОДОЛЖАЕТСЯ</span>
      <h2>Ход {turn}</h2>
      <p>Посланники в пути. Мир отвечает.</p>
      <button onClick={onDone}>Продолжить</button>
    </div>
  );
}
export function Fireworks(): JSX.Element {
  return (
    <div className="fireworks" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          className="firework"
          key={i}
          style={{
            left: `${10 + ((i * 29) % 80)}%`,
            top: `${8 + ((i * 17) % 48)}%`,
            animationDelay: `${i * 0.23}s`,
          }}
        >
          {Array.from({ length: 16 }, (_, j) => (
            <i
              key={j}
              style={{
                transform: `rotate(${j * 22.5}deg) translateY(-80px)`,
                background: ["#f4d573", "#6bc9fa", "#ed8d78"][i % 3],
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
