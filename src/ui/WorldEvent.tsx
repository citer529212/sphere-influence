import {
  QuickState,
  eventAffordable,
  pendingWorldEvent,
} from "../game/quickGame";
import { Modal } from "./Modal";
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
export function WorldEvent({
  game,
  onChoose,
  onClose,
}: {
  game: QuickState;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const event = pendingWorldEvent(game);
  if (!event) return null;
  return (
    <Modal
      titleId="world-event-title"
      onClose={onClose}
      className="world-event-dialog"
    >
      <span className="guide-eyebrow">
        СОБЫТИЕ · ХОД {game.turn} · {event.region.name}
      </span>
      <h2 id="world-event-title" data-autofocus tabIndex={-1}>
        {event.title}
      </h2>
      <p>{event.text}</p>
      <p>
        Выберите ответ до начала кампаний. Это отдельное решение: ваши действия
        за ход сохранятся.
      </p>
      <div className="event-options">
        {event.options.map((option) => {
          const affordable = eventAffordable(game, option),
            support = Math.min(
              option.support,
              100 - event.region.influence[game.player],
            ),
            trust =
              Math.max(0, Math.min(100, game.trust + option.trust)) -
              game.trust,
            fatigue =
              Math.max(
                0,
                Math.min(100, event.region.fatigue + option.fatigue),
              ) - event.region.fatigue;
          return (
            <button
              key={option.id}
              disabled={!affordable}
              onClick={() => onChoose(option.id)}
            >
              <strong>{option.title}</strong>
              <span>{option.text}</span>
              <small>
                Поддержка {signed(support)} · доверие {signed(trust)} · ресурс{" "}
                {signed(option.resource)} · усталость {signed(fatigue)}
              </small>
              {!affordable && <em>Не хватает медиаресурса</em>}
            </button>
          );
        })}
      </div>
      <p className="event-footnote">
        Поддержка меняется только в городе {event.region.name}. Соперники тоже
        выберут свой ответ во время их хода. Выбор нельзя повторить после
        перезагрузки.
      </p>
      <button onClick={onClose}>Осмотреть карту</button>
    </Modal>
  );
}
