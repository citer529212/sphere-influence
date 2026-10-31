import { useCallback, useEffect, useRef, useState } from "react";
import { FactionId } from "../game/types";
import {
  LESSONS,
  Lesson,
  PracticeEvent,
  createPractice,
  practiceStep,
  practiceComplete,
  loadLearning,
  saveLearning,
  LearningProgress,
} from "../game/tutorial";
import { browserStorage } from "../game/session";
import { FACTION_IDS, REALMS, climateDescription } from "../game/realms";
import {
  TOPICS,
  CITY_TOPICS,
  MEDIA_LINKS,
  newsAt,
  TopicId,
} from "../game/information";
import {
  actionCost,
  actionError,
  QUICK_ACTIONS,
  QuickAction,
  mediaReach,
  turnIncome,
  citySpecialty,
  campaignGain,
  repeatPenalty,
  decisionLimit,
  pendingWorldEvent,
  eventAffordable,
  objective,
  supportNeeded,
  rivalOutlook,
} from "../game/quickGame";
import { Modal } from "./Modal";

function Exercise({
  lesson,
  player,
  onAdvance,
}: {
  lesson: Lesson;
  player: FactionId;
  onAdvance: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, []);
  const [sample, setSample] = useState(() => createPractice(lesson.id, player)),
    [answer, setAnswer] = useState<number | null>(null);
  const send = (e: PracticeEvent) => setSample((s) => practiceStep(s, e));
  const game = sample.game,
    region = game.regions.find((r) => r.id === sample.selected)!,
    reach = mediaReach(game),
    pending = pendingWorldEvent(game),
    done =
      lesson.kind === "quiz"
        ? answer === lesson.quiz?.correct
        : practiceComplete(lesson, sample),
    mode = objective(game),
    busy = sample.frames.length > 0;
  const news = newsAt(game.turn);
  const showPractice = lesson.kind !== "quiz";
  return (
    <>
      <div className="school-body">
        <article className="school-explanation">
          <span className="guide-eyebrow">
            {lesson.group} · {REALMS[player].name}
          </span>
          <h3 ref={heading} tabIndex={-1} data-autofocus>
            {lesson.title}
          </h3>
          {lesson.explanation.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="school-task">
            <strong>Задание</strong>
            <p>{lesson.task}</p>
          </div>
          {lesson.quiz && (
            <fieldset className="school-quiz">
              <legend>{lesson.quiz.question}</legend>
              {lesson.quiz.answers.map((text, i) => (
                <button
                  key={text}
                  aria-pressed={answer === i}
                  onClick={() => setAnswer(i)}
                >
                  {text}
                </button>
              ))}
              {answer !== null && (
                <p
                  role="status"
                  className={done ? "school-success" : "school-retry"}
                >
                  {done
                    ? lesson.quiz.why
                    : "Пока неверно. Перечитайте объяснение и попробуйте другой ответ."}
                </p>
              )}
            </fieldset>
          )}
          {showPractice && (
            <p className="school-feedback" role="status">
              {sample.feedback}
            </p>
          )}
          {lesson.id === "rulers" && (
            <p>
              <b>Ваш правитель: {REALMS[player].ruler}.</b>
              <br />
              {REALMS[player].privilege}
              <br />
              {REALMS[player].drawback}
            </p>
          )}
        </article>
        {showPractice && (
          <section className="school-practice" aria-label="Учебная партия">
            <div className="school-stats">
              <span>
                ◈ {game.influence} <small>+{turnIncome(game)}/ход</small>
              </span>
              <span>♡ {game.trust}%</span>
              <span>
                Решения {game.actions}/{decisionLimit(game)}
              </span>
              <span>Ход {game.turn}</span>
            </div>
            <p className="school-sandbox-note">
              Отдельный пример · основная партия не меняется
            </p>
            <div
              className="school-map"
              role="group"
              aria-label="Выбрать учебный город"
            >
              {game.regions.map((r, i) => (
                <button
                  key={r.id}
                  disabled={busy}
                  className={`${reach.has(i) ? "" : "outside"} ${r.id === sample.initial ? "school-target" : ""}`}
                  aria-pressed={r.id === sample.selected}
                  onClick={() => send({ type: "select", id: r.id })}
                >
                  <i
                    style={{
                      background:
                        r.infoController === "contested"
                          ? "#939c98"
                          : REALMS[r.infoController].color,
                    }}
                  />
                  {r.name}
                  <small>
                    {r.politicalOwner === "neutral"
                      ? "Остров"
                      : REALMS[r.politicalOwner].name}{" "}
                    · вы {r.influence[player]}%
                    {sample.network
                      ? ` · ${reach.has(i) ? "В охвате" : "Вне охвата"}`
                      : ""}
                  </small>
                </button>
              ))}
            </div>
            <button
              aria-pressed={sample.network}
              className="school-network"
              onClick={() => send({ type: "network" })}
              disabled={busy}
            >
              ◎ {sample.network ? "Связи включены" : "Показать связи и охват"}
            </button>
            {sample.network && (
              <p className="school-reach">
                Связи выбранного города:{" "}
                {MEDIA_LINKS.filter(
                  ([a, b]) =>
                    a === game.regions.indexOf(region) ||
                    b === game.regions.indexOf(region),
                )
                  .map(
                    ([a, b]) =>
                      game.regions[a === game.regions.indexOf(region) ? b : a]
                        .name,
                  )
                  .join(", ")}
                . Доступно {reach.size} из 16 городов. Яркие кнопки — в охвате,
                приглушённые — вне охвата.
              </p>
            )}
            <h4>{region.name}</h4>
            <p className="school-region">
              {citySpecialty(game, region).name} —{" "}
              {citySpecialty(game, region).description} ·{" "}
              {climateDescription(game.turn, game.regions.indexOf(region))}
            </p>
            <div className="school-support">
              {FACTION_IDS.map((f) => (
                <span key={f}>
                  {REALMS[f].name}: <b>{region.influence[f]}%</b>
                  {region.factCheckShield[f] > 0 ? " ◇ Щит" : ""}
                </span>
              ))}
            </div>
            <p className="school-region">
              {region.infoController === player
                ? "Вы лидируете"
                : `До лидерства +${supportNeeded(region, player)}`}{" "}
              · Усталость {region.fatigue}% · Ваша редакция:{" "}
              {region.mediaNodes[player] ? "есть" : "нет"}
            </p>
            <p className="school-region">
              <b>Инфоповод: {news.title}.</b> {news.text}
            </p>
            <div
              className="school-topics"
              role="group"
              aria-label="Учебная тема"
            >
              {(Object.keys(TOPICS) as TopicId[]).map((topic) => (
                <button
                  key={topic}
                  disabled={busy}
                  aria-pressed={game.topic === topic}
                  onClick={() => send({ type: "topic", topic })}
                >
                  {TOPICS[topic].name}
                  <small>
                    Прогноз +
                    {Math.min(
                      100 - region.influence[player],
                      campaignGain(game, region, player, topic),
                    )}
                  </small>
                </button>
              ))}
            </div>
            <p className="school-region">
              Местная повестка:{" "}
              {TOPICS[CITY_TOPICS[game.regions.indexOf(region)]].name} · штраф
              повтора −{repeatPenalty(game, region, game.topic)}
            </p>
            {pending && (
              <section className="school-event" aria-label="Учебное событие">
                <h4>{pending.title}</h4>
                <p>{pending.text}</p>
                {pending.options.map((option) => (
                  <button
                    key={option.id}
                    disabled={!eventAffordable(game, option) || busy}
                    onClick={() => send({ type: "event", id: option.id })}
                  >
                    {option.title}
                    <small>
                      Ресурс {option.resource >= 0 ? "+" : ""}
                      {option.resource} · доверие {option.trust >= 0 ? "+" : ""}
                      {option.trust} · поддержка +
                      {Math.min(
                        option.support,
                        100 - pending.region.influence[player],
                      )}{" "}
                      · усталость {option.fatigue}
                    </small>
                  </button>
                ))}
              </section>
            )}
            <div className="school-actions">
              {(["media", "attract", "protect"] as QuickAction[]).map(
                (action) => {
                  const error = actionError(game, region, action),
                    required =
                      lesson.kind === "media" ||
                      lesson.kind === "network" ||
                      lesson.kind === "third"
                        ? action === "media"
                        : lesson.kind === "protect"
                          ? action === "protect"
                          : [
                              "campaign",
                              "neutral",
                              "repeat",
                              "shield",
                            ].includes(lesson.kind) && action === "attract";
                  return (
                    <button
                      key={action}
                      data-required={required && !done}
                      disabled={busy || !!error}
                      title={error ?? QUICK_ACTIONS[action].description}
                      onClick={() => send({ type: "action", action })}
                    >
                      {QUICK_ACTIONS[action].name} · ◈{" "}
                      {actionCost(game, action)}
                      <small>
                        {error ?? QUICK_ACTIONS[action].description}
                      </small>
                    </button>
                  );
                },
              )}
            </div>
            {busy ? (
              <button
                className="school-turn"
                onClick={() => send({ type: "frame" })}
              >
                Следующее действие · {sample.frame + 1}/{sample.frames.length}
              </button>
            ) : (
              <button
                className="school-turn"
                disabled={!!game.result || !!pending}
                data-required={
                  ["turn", "victory", "rival"].includes(lesson.kind) && !done
                }
                onClick={() => send({ type: "turn" })}
              >
                Завершить учебный ход →
              </button>
            )}
            <p className="school-region">
              Цель: {mode.goal} городов · доверие ≥{mode.trust}% · удержание{" "}
              {game.held}/{mode.hold}
              {game.result
                ? ` · ${game.result === "win" ? "Учебная победа" : "Учебная неудача"}`
                : ""}
            </p>
            <details className="school-rivals" open={lesson.kind === "rival"}>
              <summary>Состояние соперников</summary>
              {FACTION_IDS.filter((f) => f !== player).map((f) => {
                const rival = rivalOutlook(game, f);
                return (
                  <p className="school-region" key={f}>
                    {REALMS[f].name}: {rival.cities}/{rival.goal ?? "—"} городов
                    · доверие {game.rivalTrust[f]}% · удержание {rival.held}/2
                  </p>
                );
              })}
            </details>
            <button
              className="school-reset"
              onClick={() => {
                setSample(createPractice(lesson.id, player));
                setAnswer(null);
              }}
            >
              Повторить пример
            </button>
          </section>
        )}
      </div>
      <div className="school-exercise-footer">
        <p role="status">
          {done
            ? "✓ Задание выполнено. Можно переходить дальше."
            : "Выполните задание или пропустите этот раздел."}
        </p>
        <button className="school-next" disabled={!done} onClick={onAdvance}>
          {lesson.id === "finish" ? "Завершить обучение →" : "Следующий этап →"}
        </button>
      </div>
    </>
  );
}

export default function Tutorial({
  player,
  onClose,
}: {
  player: FactionId;
  onClose: (complete: boolean) => void;
}) {
  const [store] = useState(browserStorage),
    [progress, setProgress] = useState<LearningProgress>(() =>
      loadLearning(store),
    ),
    [saved, setSaved] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    setSaved(saveLearning(store, progress));
  }, [store, progress]);
  const exit = useCallback(() => onClose(false), [onClose]);
  const lesson = LESSONS[progress.index],
    completed = progress.completed.length;
  const go = (index: number) => {
    setProgress((p) => ({ ...p, index }));
    setRevision((v) => v + 1);
  };
  const next = (mastered: boolean) => {
    const completed = mastered
      ? [...new Set([...progress.completed, lesson.id])]
      : progress.completed;
    const next = {
      index: Math.min(LESSONS.length - 1, progress.index + 1),
      completed,
    };
    setProgress(next);
    setRevision((v) => v + 1);
    if (progress.index === LESSONS.length - 1) {
      saveLearning(store, next);
      onClose(completed.length === LESSONS.length);
    }
  };
  return (
    <Modal titleId="school-title" onClose={exit} className="school-modal">
      <header className="school-header">
        <div>
          <span className="guide-eyebrow">
            ШКОЛА ВЛИЯНИЯ · {progress.index + 1}/{LESSONS.length}
          </span>
          <h2 id="school-title" tabIndex={-1} data-autofocus>
            Пошаговое обучение
          </h2>
          <p>
            Изучено {completed} из {LESSONS.length} разделов ·{" "}
            {saved
              ? "прогресс сохранён"
              : "сохранение недоступно — обучение работает"}
          </p>
        </div>
        <button onClick={() => onClose(false)}>Приостановить обучение</button>
      </header>
      <progress
        max={LESSONS.length}
        value={completed}
        aria-label="Пройденные разделы"
      />
      <details className="school-contents">
        <summary>Все разделы · можно перейти к любому</summary>
        <nav aria-label="Разделы обучения">
          {LESSONS.map((l, i) => (
            <button
              key={l.id}
              aria-current={i === progress.index ? "step" : undefined}
              onClick={() => go(i)}
            >
              {progress.completed.includes(l.id) ? "✓ " : ""}
              {i + 1}. {l.title}
            </button>
          ))}
        </nav>
        <button
          onClick={() => {
            setProgress({ index: 0, completed: [] });
            setRevision((v) => v + 1);
          }}
        >
          Пройти курс заново
        </button>
      </details>
      <Exercise
        key={`${lesson.id}-${revision}`}
        lesson={lesson}
        player={player}
        onAdvance={() => next(true)}
      />
      <footer className="school-nav">
        <button
          disabled={progress.index === 0}
          onClick={() => go(progress.index - 1)}
        >
          ← Предыдущий этап
        </button>
        <button onClick={() => next(false)}>
          {progress.index === LESSONS.length - 1
            ? "К основной игре"
            : "Пропустить этот этап →"}
        </button>
      </footer>
    </Modal>
  );
}
