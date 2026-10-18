import { ACTIONS, FACTIONS, NARRATIVES } from '../game/data';
import { ActionId, FactionId, GameState, NarrativeId, Region } from '../game/types';
import { canPlayerUseAction, getActionPreview } from '../game/simulation';

interface ActionPanelProps {
  state: GameState;
  playerFaction: FactionId;
  selectedRegion: Region | null;
  selectedNarrative: NarrativeId;
  onNarrativeChange: (id: NarrativeId) => void;
  onAction: (actionId: ActionId) => void;
  onEndTurn: () => void;
}

function costText(actionId: ActionId): string {
  const cost = ACTIONS[actionId].cost;
  const labels: Record<string, string> = {
    influence: 'Влияние',
    attention: 'Внимание',
    trust: 'Доверие',
    mediaPower: 'Медиамощность',
    culture: 'Культурный капитал'
  };
  return Object.entries(cost)
    .map(([key, value]) => `${labels[key] ?? key}: ${value}`)
    .join(', ');
}

export function ActionPanel({
  state,
  playerFaction,
  selectedRegion,
  selectedNarrative,
  onNarrativeChange,
  onAction,
  onEndTurn
}: ActionPanelProps): JSX.Element {
  const faction = FACTIONS[playerFaction];
  const actionIds = Object.keys(ACTIONS) as ActionId[];

  return (
    <section className="panel action-panel">
      <h2>Действия</h2>
      <p className="muted">{faction.name}: {state.actionsLeft} из 3 действий.</p>

      <label className="narrative-select">
        Активный нарратив:
        <select
          value={selectedNarrative}
          onChange={(event) => onNarrativeChange(event.target.value as NarrativeId)}
        >
          {(Object.keys(NARRATIVES) as NarrativeId[]).map((id) => (
            <option key={id} value={id}>
              {NARRATIVES[id].name}
            </option>
          ))}
        </select>
      </label>

      <div className="action-list">
        {actionIds.map((actionId) => {
          const action = ACTIONS[actionId];
          const preview = getActionPreview(state, selectedRegion, actionId, selectedNarrative);
          const canUse = canPlayerUseAction(state, actionId) && state.actionsLeft > 0;

          return (
            <article key={actionId} className={`action-item ${action.dangerous ? 'danger' : ''}`}>
              <h3>{action.name}</h3>
              <p>Цена: {costText(actionId)}</p>
              <p>{action.effect}</p>
              <p className="risk">Риск: {preview.risk}</p>
              <ul>
                {preview.lines.map((line) => (
                  <li key={`${actionId}-${line}`}>{line}</li>
                ))}
              </ul>
              <button disabled={!canUse || !selectedRegion} onClick={() => onAction(actionId)}>
                Применить
              </button>
            </article>
          );
        })}
      </div>

      <button className="end-turn" onClick={onEndTurn}>
        Завершить ход
      </button>
    </section>
  );
}
