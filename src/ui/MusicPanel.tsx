import { Modal } from "./Modal";
import {
  MUSIC,
  MUSIC_EDITS,
  MUSIC_LICENSE,
  MUSIC_LICENSE_URL,
} from "./musicAssets";
import { MusicPreferences, MusicStatus } from "./music";
export function MusicControls({
  value,
  onChange,
  status,
}: {
  value: MusicPreferences;
  onChange: (v: MusicPreferences) => void;
  status: MusicStatus;
}) {
  return (
    <fieldset className="music-controls">
      <legend>Фоновая музыка</legend>
      <label>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) =>
            onChange({ ...value, enabled: event.target.checked })
          }
        />{" "}
        Музыка включена
      </label>
      <label htmlFor="music-volume">
        Громкость музыки: {Math.round(value.volume * 100)}%
      </label>
      <input
        id="music-volume"
        type="range"
        min="0"
        max="100"
        step="1"
        value={Math.round(value.volume * 100)}
        onChange={(event) =>
          onChange({ ...value, volume: Number(event.target.value) / 100 })
        }
      />
      <p role="status">
        {status === "error"
          ? "Музыка недоступна. Игра продолжается; нажмите «Повторить» для новой попытки."
          : status === "blocked"
            ? "Браузер ожидает нажатия. Нажмите «Включить / повторить»."
            : status === "loading"
              ? "Загружаем выбранную тему…"
              : "Музыка и эффекты настраиваются отдельно. Настройки сохраняются на этом устройстве, если браузер разрешает хранение."}
      </p>
    </fieldset>
  );
}
export function MusicPanel({
  value,
  onChange,
  status,
  onRetry,
  onClose,
}: {
  value: MusicPreferences;
  onChange: (v: MusicPreferences) => void;
  status: MusicStatus;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <Modal titleId="music-title" onClose={onClose} className="music-panel">
      <h2 id="music-title">Музыка</h2>
      <MusicControls value={value} onChange={onChange} status={status} />
      <button onClick={onRetry}>Включить / повторить</button>
      <p>Все восемь произведений: Kevin MacLeod (Incompetech).</p>
      <p>
        {MUSIC_LICENSE}{" "}
        <a href={MUSIC_LICENSE_URL} target="_blank" rel="noreferrer">
          Creative Commons Attribution 4.0
        </a>
        .
      </p>
      <ul className="music-credits">
        {Object.values(MUSIC).map((track) => (
          <li key={track.isrc}>
            <strong>{track.title}</strong> — Kevin MacLeod (incompetech.com).{" "}
            <a
              href={`https://incompetech.com/music/royalty-free/index.html?isrc=${track.isrc}`}
              target="_blank"
              rel="noreferrer"
            >
              Источник · {track.isrc}
            </a>
            <p>{track.edit}</p>
          </li>
        ))}
      </ul>
      <h3>Изменения записей</h3>
      <p>{MUSIC_EDITS}</p>
      <p>
        Музыка распространяется по CC BY 4.0. Условия использования остальных
        материалов игры определяются отдельно. Ссылки на источники и лицензию
        требуют интернета; воспроизведение музыки — нет.
      </p>
      <button onClick={onClose}>Вернуться в игру</button>
    </Modal>
  );
}
