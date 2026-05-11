import { FACTIONS } from '../game/data';
import { FactionId, GameState } from '../game/types';

interface TopBarProps {
  state: GameState;
  playerFaction: FactionId;
  playerRatio: number;
  neutralRatio: number;
}

export function TopBar({ state, playerFaction, playerRatio, neutralRatio }: TopBarProps): JSX.Element {
  const player = FACTIONS[playerFaction];

  return (
    <header className="topbar">
      <div className="topbar-main">
        <h1>Сфера влияния</h1>
        <p>
          Ход {state.turn} · Действий осталось: <strong>{state.actionsLeft}</strong>
        </p>
      </div>

      <div className="resource-list">
        <span>Влияние: {state.resources.influence}</span>
        <span>Внимание: {state.resources.attention}</span>
        <span>Доверие: {state.resources.trust}</span>
        <span>Медиамощность: {state.resources.mediaPower}</span>
        <span>Культурный капитал: {state.resources.culture}</span>
      </div>

      <div className="event-box">
        <strong>Событие:</strong>{' '}
        {state.currentEvent ? `${state.currentEvent.name} — ${state.currentEvent.description}` : 'Пока без глобальных всплесков.'}
      </div>

      <div className="progress-row">
        <span>
          {player.name}: {(playerRatio * 100).toFixed(0)}% инфоконтроля, серия {state.consecutiveMajority[playerFaction]}/3
        </span>
        <span>Нейтральные+спорные: {(neutralRatio * 100).toFixed(0)}%</span>
      </div>
    </header>
  );
}
