import { useMemo, useState } from 'react';
import { ActionPanel } from './components/ActionPanel';
import { WorldScene } from './components/WorldScene';
import { RegionPanel } from './components/RegionPanel';
import { TopBar } from './components/TopBar';
import { FACTIONS, PLAYER_FACTION, createInitialState } from './game/data';
import { applyPlayerAction, endTurn, getControlProgress } from './game/simulation';
import { ActionId, NarrativeId } from './game/types';

export default function App(): JSX.Element {
  const [state, setState] = useState(createInitialState);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(state.regions[0]?.id ?? null);
  const [selectedNarrative, setSelectedNarrative] = useState<NarrativeId>('security');
  const [showRules, setShowRules] = useState(false);

  const selectedRegion =
    selectedRegionId !== null ? state.regions.find((region) => region.id === selectedRegionId) ?? null : null;

  const playerProgress = useMemo(() => getControlProgress(state, PLAYER_FACTION), [state]);

  const neutralProgress = useMemo(() => {
    const subset = state.regions.filter(
      (region) => region.type === 'Нейтральный регион' || region.type === 'Спорная зона'
    );
    if (subset.length === 0) {
      return 0;
    }
    const controlled = subset.filter((region) => region.infoController === PLAYER_FACTION).length;
    return controlled / subset.length;
  }, [state]);

  const applyActionHandler = (actionId: ActionId): void => {
    if (!selectedRegion) {
      return;
    }

    setState((prev) => applyPlayerAction(prev, selectedRegion.id, actionId, selectedNarrative));
  };

  const endTurnHandler = (): void => {
    setState((prev) => endTurn(prev));
  };

  return (
    <div className="layout">
      <TopBar
        state={state}
        playerFaction={PLAYER_FACTION}
        playerRatio={playerProgress.ratio}
        neutralRatio={neutralProgress}
      />

      <main className="main-grid">
        <WorldScene
          regions={state.regions}
          selectedRegionId={selectedRegionId}
          onSelectRegion={setSelectedRegionId}
        />

        <RegionPanel region={selectedRegion} playerFaction={PLAYER_FACTION} />
      </main>

      <ActionPanel
        state={state}
        playerFaction={PLAYER_FACTION}
        selectedRegion={selectedRegion}
        selectedNarrative={selectedNarrative}
        onNarrativeChange={setSelectedNarrative}
        onAction={applyActionHandler}
        onEndTurn={endTurnHandler}
      />

      <section className="panel log-panel">
        <div className="panel-row">
          <h2>Журнал</h2>
          <button onClick={() => setShowRules((prev) => !prev)}>{showRules ? 'Скрыть правила' : 'Правила'}</button>
        </div>
        <ul>
          {state.log.slice(0, 5).map((entry, index) => (
            <li key={`${index.toString()}-${entry}`}>{entry}</li>
          ))}
        </ul>
      </section>

      {showRules && (
        <section className="panel rules">
          <h2>Короткие правила</h2>
          <p>
            Политический контроль не меняется в MVP. Слой «Державы» показывает политические границы. Вы играете за Синий Атлас и боретесь за
            информационный контроль: цветная полоса у названия города и границы в слое «Инфоконтроль».
          </p>
          <p>
            На ход: 3 действия. Агрессивные кампании поднимают усталость, а высокая усталость режет эффективность и
            может вызвать кризис доверия.
          </p>
          <p>
            Победа: 60% инфоконтроля по карте 3 хода подряд или 75% контроля нейтральных и спорных регионов.
            Поражение: аналогичное достижение AI или кризис доверия.
          </p>
        </section>
      )}

      {(state.victory.winner || state.victory.loser) && (
        <section className="result-overlay">
          <div className="result-box">
            <h2>
              {state.victory.winner === PLAYER_FACTION
                ? 'Победа Синего Атласа'
                : state.victory.loser
                  ? 'Поражение'
                  : 'Завершение партии'}
            </h2>
            <p>{state.victory.reason}</p>
            {state.victory.winner && state.victory.winner !== PLAYER_FACTION && (
              <p>Победитель: {FACTIONS[state.victory.winner].name}</p>
            )}
            <button
              onClick={() => {
                const fresh = createInitialState();
                setState(fresh);
                setSelectedRegionId(fresh.regions[0]?.id ?? null);
                setSelectedNarrative('security');
              }}
            >
              Начать заново
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
