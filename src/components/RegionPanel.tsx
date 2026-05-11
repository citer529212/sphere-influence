import { FACTIONS, NARRATIVES } from '../game/data';
import { FactionId, Region } from '../game/types';

interface RegionPanelProps {
  region: Region | null;
  playerFaction: FactionId;
}

export function RegionPanel({ region, playerFaction }: RegionPanelProps): JSX.Element {
  if (!region) {
    return (
      <aside className="panel region-panel">
        <h2>Регион</h2>
        <p>Выберите регион на карте.</p>
      </aside>
    );
  }

  const ownerName = region.politicalOwner === 'neutral' ? 'Нейтралы' : FACTIONS[region.politicalOwner].name;
  const infoName = region.infoController === 'contested' ? 'Спорный' : FACTIONS[region.infoController].name;

  const progress = {
    openness: `${region.openness}%`,
    resistance: `${region.resistance}%`,
    fatigue: `${region.fatigue}%`
  };

  return (
    <aside className="panel region-panel">
      <h2 className="region-title">{region.name}</h2>
      <p className="muted region-subtitle">{region.type}</p>
      <h3 className="region-section">Контроль</h3>
      <div className="kv-grid region-kv">
        <span>◈ Политический владелец</span>
        <strong>{ownerName}</strong>
        <span>◎ Инфоконтроль</span>
        <strong>{infoName}</strong>
        <span>⌘ Лендформа</span>
        <strong>{region.landform}</strong>
        <span>▦ Массив</span>
        <strong>{region.landmass}</strong>
        <span>✦ Нарратив</span>
        <strong>{NARRATIVES[region.dominantNarrative].name}</strong>
        <span>Открытость</span>
        <strong>{region.openness}</strong>
        <span>Сопротивление</span>
        <strong>{region.resistance}</strong>
        <span>Усталость</span>
        <strong>{region.fatigue}</strong>
      </div>
      <div className="metric-stack">
        <div className="metric-item">
          <label>Открытость</label>
          <div className="metric-bar"><i style={{ width: progress.openness }} /></div>
        </div>
        <div className="metric-item">
          <label>Сопротивление</label>
          <div className="metric-bar resistance"><i style={{ width: progress.resistance }} /></div>
        </div>
        <div className="metric-item">
          <label>Усталость</label>
          <div className="metric-bar fatigue"><i style={{ width: progress.fatigue }} /></div>
        </div>
      </div>
      <h3 className="region-section">Ваши показатели</h3>
      <div className="kv-grid region-kv">
        <span>Влияние</span>
        <strong>{region.influence[playerFaction]}</strong>
        <span>Доверие</span>
        <strong>{region.trust[playerFaction]}</strong>
        <span>Медиадоля</span>
        <strong>{region.mediaShare[playerFaction]}</strong>
        <span>Лояльность элит</span>
        <strong>{region.eliteLoyalty[playerFaction]}</strong>
      </div>
      <h3 className="region-section">Контекст</h3>
      <p>Issue-теги: {region.currentIssue.join(', ')}</p>
      <p>Культура: {region.culturalProfile.join(', ')}</p>
    </aside>
  );
}
