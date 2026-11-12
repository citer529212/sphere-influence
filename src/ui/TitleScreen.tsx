import type { DifficultyId } from '../game/information';
import { MAP_PRESENTATION } from '../game/mapPresentation';
import { INTRO_POSTER } from './cinematicAssets';
import { Modal } from './Modal';

type Props = {
  difficulty:DifficultyId;
  sound:boolean;
  onPlay:()=>void;
  onLearn:()=>void;
  onRules:()=>void;
  onMusic:()=>void;
  onSound:()=>void;
};

export function TitleScreen({difficulty,sound,onPlay,onLearn,onRules,onMusic,onSound}:Props) {
  return <Modal className="atlas-title-screen" titleId="atlas-title" onClose={onPlay}>
    <img className="atlas-title-art" src={INTRO_POSTER} alt="" />
    <div className="atlas-title-copy">
      <span className="map-eyebrow">Атлас трёх корон</span>
      <h1 id="atlas-title">Сферы влияния</h1>
      <p>{MAP_PRESENTATION[difficulty].description}</p>
      <nav aria-label="Главное меню" className="atlas-title-buttons">
        <button onClick={onPlay} data-autofocus>Начать партию</button>
        <button onClick={onLearn}>Обучение на карте</button>
        <button onClick={onRules}>Правила игры</button>
      </nav>
      <details className="atlas-title-settings">
        <summary>Настройки</summary>
        <button onClick={onMusic}>Музыка и громкость</button>
        <button onClick={onSound} aria-pressed={sound}>Звуки игры {sound?'включены':'выключены'}</button>
      </details>
    </div>
  </Modal>;
}
