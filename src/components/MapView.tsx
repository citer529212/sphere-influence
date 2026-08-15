import { FACTIONS } from '../game/data';
import { ControllerId, FactionId, NarrativeId, Region } from '../game/types';
import { ATLAS_REGION_VISUALS, ATLAS_VIEWBOX } from '../game/atlasMapVisuals';

interface MapViewProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
}

function narrativeShortLabel(narrativeId: NarrativeId): string {
  const map: Record<NarrativeId, string> = {
    security: 'Без',
    sovereignty: 'Сув',
    development: 'Раз',
    progress: 'Про',
    stability: 'Стаб',
    freedoms: 'Своб'
  };
  return map[narrativeId];
}

function controllerStroke(controller: ControllerId): string {
  if (controller === 'atlas') return '#66c7ff';
  if (controller === 'meridian') return '#ff8a8a';
  if (controller === 'concordat') return '#ffe477';
  return '#c8c2b5';
}

function controllerCode(controller: ControllerId): string {
  if (controller === 'atlas') return 'СА';
  if (controller === 'meridian') return 'КМ';
  if (controller === 'concordat') return 'ЗК';
  return 'СП';
}

function fatigueColor(fatigue: number): string {
  if (fatigue > 60) return '#e85c5c';
  if (fatigue >= 30) return '#f1ca55';
  return '#62d296';
}

function factionInfoWeight(region: Region, faction: FactionId): number {
  return region.influence[faction] * 0.4
    + region.trust[faction] * 0.25
    + region.mediaShare[faction] * 0.25
    + region.eliteLoyalty[faction] * 0.1
    - region.fatigue * 0.1;
}

function leadingInfluenceFaction(region: Region): FactionId {
  const factions: FactionId[] = ['atlas', 'meridian', 'concordat'];
  return factions.reduce((leader, faction) => (
    region.influence[faction] > region.influence[leader] ? faction : leader
  ), 'atlas');
}

function controlReadout(region: Region): { controller: ControllerId; color: string; percent: number; dashWidth: number } {
  const factions: FactionId[] = ['atlas', 'meridian', 'concordat'];
  const ranked = factions
    .map((faction) => ({ faction, weight: factionInfoWeight(region, faction) }))
    .sort((a, b) => b.weight - a.weight);
  const top = ranked[0];
  const second = ranked[1];
  const controller = region.infoController === 'contested' ? 'contested' : region.infoController;
  const relevantWeight = controller === 'contested' ? top.weight : factionInfoWeight(region, controller);
  const gap = Math.max(0, top.weight - second.weight);
  const base = controller === 'contested' ? 28 + gap * 2 : relevantWeight * 0.8 + gap * 1.4;
  const percent = Math.max(12, Math.min(100, Math.round(base)));

  return {
    controller,
    color: controllerStroke(controller === 'contested' ? top.faction : controller),
    percent,
    dashWidth: Math.max(8, Math.min(42, percent * 0.42))
  };
}

function influenceHatchOpacity(region: Region, leader: FactionId): number {
  const leaderValue = region.influence[leader];
  const isStatusQuo = region.politicalOwner === leader && region.infoController === leader;
  const controlBonus = region.infoController === leader ? 0.08 : 0;

  if (isStatusQuo) {
    return 0.04;
  }

  return Math.min(0.62, Math.max(0.18, leaderValue / 145 + controlBonus));
}

export function MapView({ regions, selectedRegionId, onSelectRegion }: MapViewProps): JSX.Element {
  return (
    <section className="map-card atlas-map-shell">
      <h2>Карта влияния</h2>
      <div className="map-main">
        <svg viewBox={ATLAS_VIEWBOX} preserveAspectRatio="xMidYMid meet" className="atlas-map-svg">
          <defs>
            <pattern id="influence-hatch-atlas" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#66c7ff" strokeWidth="4" opacity="0.9" />
            </pattern>
            <pattern id="influence-hatch-meridian" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#ff707a" strokeWidth="4" opacity="0.9" />
            </pattern>
            <pattern id="influence-hatch-concordat" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#ffe477" strokeWidth="4" opacity="0.9" />
            </pattern>
          </defs>

          <rect className="ocean-bg" x="0" y="0" width="1200" height="720" />
          <image
            href={`${import.meta.env.BASE_URL}designer-map.svg?v=20260812-map3`}
            x="0"
            y="0"
            width="1200"
            height="720"
            preserveAspectRatio="xMidYMid meet"
            className="designer-map-backdrop"
          />

          {regions.map((region) => {
            const visual = ATLAS_REGION_VISUALS[region.id];
            if (!visual) return null;
            const selected = selectedRegionId === region.id;
            const fractured = region.politicalOwner !== region.infoController;
            const influenceLeader = leadingInfluenceFaction(region);
            const hatchOpacity = influenceHatchOpacity(region, influenceLeader);
            const control = controlReadout(region);
            const controlColor = control.color;

            return (
              <g key={region.id}>
                <path
                  d={visual.path}
                  className="influence-hatch"
                  fill={`url(#influence-hatch-${influenceLeader})`}
                  opacity={hatchOpacity}
                  pointerEvents="none"
                />

                <path
                  d={visual.path}
                  className="control-wash"
                  fill={controlColor}
                  opacity={selected ? 0.16 : 0.07 + control.percent / 1400}
                  pointerEvents="none"
                />

                <path
                  d={visual.path}
                  className={`region-path ${selected ? 'selected' : ''}`}
                  fill="transparent"
                  stroke={controlColor}
                  strokeWidth={selected ? 5 : 1.6 + control.percent / 55}
                  strokeOpacity={selected ? 1 : 0.45 + control.percent / 240}
                  pointerEvents="all"
                  onClick={() => onSelectRegion(region.id)}
                >
                  <title>{`${region.name}
Тип: ${region.type}
Политический: ${region.politicalOwner === 'neutral' ? 'Нейтральные земли' : FACTIONS[region.politicalOwner].name}
Инфоконтроль: ${region.infoController === 'contested' ? 'Спорный' : FACTIONS[region.infoController].name}
Лидер влияния: ${FACTIONS[influenceLeader].name}`}</title>
                </path>

                <g className="region-label dynamic-region-label" style={{ fontSize: `${visual.fontSize ?? 14}px` }}>
                  <text x={visual.labelX} y={visual.labelY - 15} textAnchor="middle" dominantBaseline="middle" className="region-label-abbr">
                    {narrativeShortLabel(region.dominantNarrative)}
                  </text>
                  <text x={visual.labelX - 31} y={visual.labelY + 15} textAnchor="middle" dominantBaseline="middle" className="control-code" fill={controlColor}>
                    {controllerCode(control.controller)}
                  </text>
                  <line x1={visual.labelX - 18} y1={visual.labelY + 15} x2={visual.labelX + 24} y2={visual.labelY + 15} className="control-meter-bg" />
                  <line x1={visual.labelX - 18} y1={visual.labelY + 15} x2={visual.labelX - 18 + control.dashWidth} y2={visual.labelY + 15} className="control-meter-fill" stroke={controlColor} />
                  <text x={visual.labelX + 39} y={visual.labelY + 15} textAnchor="middle" dominantBaseline="middle" className="control-percent">
                    {control.percent}
                  </text>
                </g>

                <circle className="fatigue-dot" cx={visual.labelX} cy={visual.labelY + 29} r={4.2} fill={fatigueColor(region.fatigue)} />

                {fractured ? (
                  <text x={visual.labelX + 24} y={visual.labelY - 18} className="fracture-mark">↯</text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="legend-dock">
        <section className="legend-group">
          <h4>ЛЕГЕНДА</h4>
          <div className="legend-items">
            <span><i className="legend-dot atlas" />Синий Атлас</span>
            <span><i className="legend-dot meridian" />Красный Меридиан</span>
            <span><i className="legend-dot concordat" />Золотой Конкордат</span>
            <span><i className="legend-dot neutral" />Нейтральные земли</span>
            <span><i className="legend-meter" />Шкала = прочность инфоконтроля</span>
            <span><i className="legend-hatch atlas" />Штриховка = растущее влияние</span>
            <span><i className="legend-line" />Пунктир = Морские маршруты</span>
            <span><i className="legend-anchor" />⚓ = Морские узлы</span>
            <span><i className="legend-fracture" />↯ = Разлом контроля</span>
          </div>
        </section>
      </div>
    </section>
  );
}
