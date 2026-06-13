import { useMemo, useState } from 'react';
import { ActionPanel } from './components/ActionPanel';
import { MapView } from './components/MapView';
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
        <MapView
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
          <h2>Правила</h2>

          <h3>Цель партии</h3>
          <p>
            Вы играете за Синий Атлас. Ваша задача не захватить территории, а добиться устойчивого информационного
            контроля: чтобы повестка, доверие, медиаприсутствие и элитная лояльность работали в вашу пользу.
          </p>

          <h3>Как читать карту</h3>
          <ul>
            <li>Заливка региона показывает политического владельца. В MVP политический владелец не меняется.</li>
            <li>Контур региона показывает информационного контролера. Именно за этот контроль идет борьба.</li>
            <li>Знак разлома означает, что политический владелец и информационный контролер разные.</li>
            <li>Точка под подписью показывает усталость аудитории: зеленая низкая, желтая средняя, красная высокая.</li>
            <li>Аббревиатура в регионе показывает доминирующий нарратив: Без, Сув, Раз, Про, Стаб или Своб.</li>
          </ul>

          <h3>Ход и ресурсы</h3>
          <p>
            Каждый ход у вас есть 3 действия. Ресурсы приходят от регионов, где у вас есть информационный контроль,
            сильная медиадоля, высокое доверие или культурное присутствие.
          </p>
          <ul>
            <li>Влияние нужно для кампаний и изменения баланса сил.</li>
            <li>Внимание тратится на реакции, контрнарративы и фактчекинг.</li>
            <li>Доверие отражает репутационный запас и устойчивость ваших сообщений.</li>
            <li>Медиамощность отвечает за охват и инфраструктуру.</li>
            <li>Культурный капитал нужен для мягкого, долгого укрепления отношений.</li>
          </ul>

          <h3>Действия игрока</h3>
          <ul>
            <li>Продвинуть повестку: быстрый рост влияния и медиадоли, но растет усталость.</li>
            <li>Культурная программа: повышает доверие, снижает сопротивление и работает мягче остальных действий.</li>
            <li>Контрнарратив: ослабляет ведущего соперника, но повышает усталость и сопротивление.</li>
            <li>Фактчекинг: повышает доверие, снижает усталость и дает защиту от чужих кампаний.</li>
            <li>Построить медиаресурс: долгосрочная инвестиция, которая усиливает будущие кампании в регионе.</li>
          </ul>

          <h3>Усталость и сопротивление</h3>
          <p>
            Частое давление перегревает регион. Высокая усталость снижает эффективность кампаний, а при критических
            значениях может запустить кризис доверия. Иногда выгоднее не давить, а восстанавливать доверие.
          </p>

          <h3>Нарративы</h3>
          <p>
            Нарратив эффективнее, если его теги совпадают с текущими проблемами региона. Например, технологический
            регион лучше реагирует на Прогресс, а кризисный или пограничный регион чаще принимает Безопасность.
          </p>

          <h3>Победа и поражение</h3>
          <ul>
            <li>Победа: контролируйте 60% регионов по информационному контролю 3 хода подряд.</li>
            <li>Альтернативная победа: контролируйте 75% нейтральных и спорных регионов.</li>
            <li>Поражение: AI-фракция достигает аналогичного результата.</li>
            <li>Кризис доверия: средняя усталость карты слишком высока, а среднее доверие к вам слишком низкое.</li>
          </ul>

          <h3>Важно</h3>
          <p>
            Это абстрактная критическая симуляция информационного влияния. Игра показывает системные последствия
            давления, усталости, сопротивления и потери доверия, а не предлагает реальные инструкции.
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
