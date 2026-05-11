import { FACTIONS } from '../game/data';
import { NarrativeId, Region } from '../game/types';
import {
  ATLAS_LANDMASS_SILHOUETTES,
  ATLAS_REGION_VISUALS,
  ATLAS_SEA_NODES,
  ATLAS_SEA_ROUTES,
  ATLAS_VIEWBOX
} from '../game/atlasMapVisuals';

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

function shortName(name: string): string {
  const map: Record<string, string> = {
    'Туманные Острова': 'Туманные о-ва',
    'Штормовой Архипелаг': 'Штормовой арх.',
    'Вулканическое Плато': 'Вулканич. плато',
    'Сердце Меридиана': 'Сердце',
    'Пепельные Равнины': 'Пепельные равн.',
    'Южный Архипелаг': 'Южный арх.'
  };

  if (map[name]) {
    return map[name];
  }

  return name.length <= 17 ? name : `${name.slice(0, 17).trim()}...`;
}

function ownerFill(owner: Region['politicalOwner']): string {
  if (owner === 'atlas') return '#2f86d5';
  if (owner === 'meridian') return '#c74242';
  if (owner === 'concordat') return '#d9b83f';
  return '#b4b0a3';
}

function controllerStroke(controller: Region['infoController']): string {
  if (controller === 'atlas') return '#66c7ff';
  if (controller === 'meridian') return '#ff8a8a';
  if (controller === 'concordat') return '#ffe477';
  return '#b4b8b0';
}

function fatigueColor(fatigue: number): string {
  if (fatigue > 60) return '#e85c5c';
  if (fatigue >= 30) return '#f1ca55';
  return '#62d296';
}

export function MapView({ regions, selectedRegionId, onSelectRegion }: MapViewProps): JSX.Element {
  return (
    <section className="map-card atlas-map-shell">
      <h2>Карта влияния</h2>
      <div className="map-main">
        <svg viewBox={ATLAS_VIEWBOX} preserveAspectRatio="xMidYMid meet" className="atlas-map-svg">
          <rect className="ocean-bg" x="0" y="0" width="1200" height="720" />

          <g>
            {ATLAS_LANDMASS_SILHOUETTES.map((shape) => (
              <path key={shape.id} className={shape.className} d={shape.path} />
            ))}
          </g>

          <g>
            {ATLAS_SEA_ROUTES.map((route) => (
              <path key={route} d={route} className="sea-route" />
            ))}
          </g>

          <g>
            {ATLAS_SEA_NODES.map((node) => (
              <g key={node.id} className="sea-node">
                <circle cx={node.x} cy={node.y} r={18} />
                <text x={node.x} y={node.y + 6} textAnchor="middle">⚓</text>
                <text x={node.x + 24} y={node.y + 5} className="sea-node-label">{node.label}</text>
              </g>
            ))}
          </g>

          {regions.map((region) => {
            const visual = ATLAS_REGION_VISUALS[region.id];
            if (!visual) return null;
            const selected = selectedRegionId === region.id;
            const fractured = region.politicalOwner !== region.infoController;
            const labelName = shortName(region.name);

            return (
              <g key={region.id}>
                <path
                  d={visual.path}
                  className={`region-path ${selected ? 'selected' : ''}`}
                  fill={ownerFill(region.politicalOwner)}
                  stroke={controllerStroke(region.infoController)}
                  strokeWidth={selected ? 3.6 : 2}
                  onClick={() => onSelectRegion(region.id)}
                >
                  <title>{`${region.name}\nТип: ${region.type}\nПолитический: ${region.politicalOwner === 'neutral' ? 'Нейтральные земли' : FACTIONS[region.politicalOwner].name}\nИнфоконтроль: ${region.infoController === 'contested' ? 'Спорный' : FACTIONS[region.infoController].name}`}</title>
                </path>

                <g className="region-label" style={{ fontSize: `${visual.fontSize ?? 14}px` }}>
                  <text x={visual.labelX} y={visual.labelY - 9} textAnchor="middle" dominantBaseline="middle" className="region-label-abbr">
                    {narrativeShortLabel(region.dominantNarrative)}
                  </text>
                  <text x={visual.labelX} y={visual.labelY + 8} textAnchor="middle" dominantBaseline="middle" className="region-label-name">
                    {labelName}
                  </text>
                </g>

                <circle className="fatigue-dot" cx={visual.labelX} cy={visual.labelY + 24} r={4.2} fill={fatigueColor(region.fatigue)} />

                {fractured ? (
                  <text x={visual.labelX + 28} y={visual.labelY - 18} className="fracture-mark">↯</text>
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
            <span><i className="legend-line" />Пунктир = Морские маршруты</span>
            <span><i className="legend-anchor" />⚓ = Морские узлы</span>
            <span><i className="legend-fracture" />↯ = Разлом контроля</span>
          </div>
        </section>
      </div>
    </section>
  );
}
