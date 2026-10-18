import { useId, useState } from 'react';
import { FACTIONS } from '../game/data';
import { Region } from '../game/types';
import { ATLAS_REGION_VISUALS, ATLAS_SEA_ROUTES, ATLAS_VIEWBOX } from '../game/atlasMapVisuals';

interface MapViewProps {
  regions: Region[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
}
const COLORS = { atlas: '#6cb7d9', meridian: '#d67d6d', concordat: '#d9c275', neutral: '#c4c5a0', contested: '#dad5bb' };
const terrain = (region: Region) => region.landform === 'mountain' || /hills|rocky|volcanic|canyon/.test(region.id) ? 'rock' : region.landmass === 'concordat_east' ? 'green' : region.landmass === 'meridian_core' ? 'dry' : 'grass';

function City({ x, y, capital, color }: { x: number; y: number; capital: boolean; color: string }): JSX.Element {
  return <g transform={`translate(${x} ${y})`} className="city-model">
    <ellipse cy="6" rx="22" ry="8" fill="#182b25" opacity=".4" />
    <path d="M-23 1 L0 -11 L24 1 L0 14 Z" fill="#a8a584" stroke="#dfd5ad" strokeWidth=".6" />
    {[-12, -3, 7, 15].map((dx, i) => <g key={dx} transform={`translate(${dx} ${i % 2 ? 3 : -2})`}>
      <path d="M-4 0 V-10 L2 -13 L6 -10 V0 L0 3 Z" fill="#c7ba95" />
      <path d="M0 -7 L6 -10 V0 L0 3Z" fill="#706c59" />
      <path d="M-4 -10 L2 -16 L6 -10 L0 -7Z" fill={color} />
      <path d="M-2 -6 V-3 M2 -5 V-2" stroke="#f8df9d" strokeWidth="1.2" />
    </g>)}
    {capital && <g><path d="M-5 -1 V-23 L2 -27 L8 -23 V-1 L1 3Z" fill="#ded2ac" /><path d="M1 -20 L8 -23 V-1 L1 3Z" fill="#8c876e" /><path d="M-6 -23 L1 -31 L9 -23 L1 -19Z" fill={color} /><path d="M1 -31 V-44 L16 -40 L1 -36" stroke="#e7dab5" fill={color} strokeWidth="1" /></g>}
  </g>;
}

export function MapView({ regions, selectedRegionId, onSelectRegion }: MapViewProps): JSX.Element {
  const id = useId().replace(/:/g, '');
  const [zoom, setZoom] = useState(1);
  const [layer, setLayer] = useState<'political' | 'information'>('political');
  const url = (name: string) => `url(#${id}-${name})`;
  return <section className="map-card atlas-map-shell">
    <div className="map-heading"><div><span className="map-eyebrow">АТЛАС ИЗВЕСТНОГО МИРА</span><h2>Сферы влияния</h2></div><span className="map-era">ЭПОХА ИНФОРМАЦИИ · I</span></div>
    <div className="map-toolbar"><div className="map-layer-switch" role="group" aria-label="Слой карты"><button aria-pressed={layer === 'political'} onClick={() => setLayer('political')}>Державы</button><button aria-pressed={layer === 'information'} onClick={() => setLayer('information')}>Инфоконтроль</button></div><span>Выберите регион для действий</span><div className="map-zoom"><button aria-label="Уменьшить карту" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .25))}>−</button><button aria-label="Сбросить масштаб" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button aria-label="Увеличить карту" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + .25))}>+</button></div></div>
    <div className="map-main">
      <svg viewBox={ATLAS_VIEWBOX} className="atlas-map-svg" style={{ width: `${zoom * 100}%` }} aria-label="Стратегическая карта регионов">
        <defs>
          <radialGradient id={`${id}-ocean`}><stop stopColor="#426c70" /><stop offset="1" stopColor="#122f3e" /></radialGradient>
          {([['grass', '#b1bd86', '#566f53'], ['green', '#b1c28a', '#537b5a'], ['dry', '#d7c294', '#a08c65'], ['rock', '#bcb8a1', '#747867']] as const).map(([name, light, dark]) => <linearGradient key={name} id={`${id}-${name}`} x2=".7" y2="1"><stop stopColor={light} /><stop offset="1" stopColor={dark} /></linearGradient>)}
          <pattern id={`${id}-sea-grid`} width="60" height="52" patternUnits="userSpaceOnUse"><path d="M30 0 L60 13 V39 L30 52 L0 39 V13 Z" fill="none" stroke="#d5dbc1" strokeOpacity=".055" /></pattern>
          <pattern id={`${id}-grain`} width="19" height="23" patternUnits="userSpaceOnUse"><path d="M2 6l5 -2 M12 16l4 1 M5 20h2" stroke="#edf0cc" strokeOpacity=".17" strokeWidth=".8" /><circle cx="14" cy="5" r="1" fill="#253e2d" opacity=".15" /></pattern>
          <filter id={`${id}-shadow`} x="-25%" y="-35%" width="160%" height="180%"><feDropShadow dx="5" dy="12" stdDeviation="6" floodColor="#081f26" floodOpacity=".65" /></filter>
          <g id={`${id}-mountain`}><ellipse cy="5" rx="20" ry="7" fill="#304535" opacity=".23" /><path d="M-22 5 L-3 -30 L22 7Z" fill="#a6a38c" /><path d="M-3 -30 L2 -2 L22 7Z" fill="#5c685f" /><path d="M-3 -30 L-12 -13 L-5 -17 L0 -12 L5 -18Z" fill="#e3dfc9" /></g>
          <g id={`${id}-tree`}><ellipse cy="3" rx="6" ry="3" fill="#324c35" opacity=".3" /><path d="M0 3 V-8" stroke="#675c42" strokeWidth="2" /><path d="M-7 -2 L0 -17 L7 -2Z" fill="#365c43" /><path d="M-5 -9 L0 -22 L5 -9Z" fill="#52754c" /></g>
          {regions.map(r => { const v = ATLAS_REGION_VISUALS[r.id]; return v ? <clipPath id={`${id}-clip-${r.id}`} key={r.id}><path d={v.path} /></clipPath> : null; })}
        </defs>
        <rect width="1200" height="720" fill={url('ocean')} />
        <rect width="1200" height="720" fill={url('sea-grid')} />
        <g className="map-decoration"><text x="225" y="660" className="ocean-label">ЗАПАДНЫЙ ОКЕАН</text><text x="864" y="73" className="ocean-label">ВОСТОЧНЫЕ МОРЯ</text><g transform="translate(72 640)"><path d="M0 -33 L7 -7 L26 0 L7 7 L0 33 L-7 7 L-26 0 L-7 -7Z" fill="none" stroke="#c6bb95" /><path d="M0 -33 L7 -7 L0 0Z" fill="#ded1a5" /><text y="-42" textAnchor="middle" fill="#e0d4b0" fontSize="13">С</text><circle r="3" fill="#d2c496" /></g></g>
        <g className="map-decoration">{ATLAS_SEA_ROUTES.map(route => <path key={route} d={route} className="sea-route" />)}</g>
        <g filter={url('shadow')} className="map-decoration">{regions.map(r => { const v = ATLAS_REGION_VISUALS[r.id]; return v ? <path key={r.id} d={v.path} transform="translate(0 8)" fill="#4d5948" stroke="#6e7860" strokeWidth="2" /> : null; })}</g>
        {regions.map((region, index) => {
          const v = ATLAS_REGION_VISUALS[region.id]; if (!v) return null;
          const selected = selectedRegionId === region.id;
          const color = COLORS[layer === 'political' ? region.politicalOwner : region.infoController];
          const fractured = region.politicalOwner !== region.infoController;
          const capital = region.type === 'Метрополия' || region.type === 'Технологический хаб';
          const owner = region.politicalOwner === 'neutral' ? 'Нейтральные земли' : FACTIONS[region.politicalOwner].name;
          return <g key={region.id} className={`terrain-region ${selected ? 'is-selected' : ''}`}>
            <path d={v.path} fill={url(terrain(region))} stroke="#e2d6af" strokeWidth="1.3" />
            <g clipPath={url(`clip-${region.id}`)} className="map-decoration">
              <path d={v.path} fill={color} opacity={layer === 'information' ? '.3' : '.12'} />
              <path d={v.path} fill={url('grain')} />
              <path d={`M${v.labelX - 90} ${v.labelY + 45} Q${v.labelX + 30} ${v.labelY - 20} ${v.labelX - 20} ${v.labelY - 100}`} fill="none" stroke="#4e7d7a" strokeWidth="3" />
              <path d={`M${v.labelX - 90} ${v.labelY + 45} Q${v.labelX + 30} ${v.labelY - 20} ${v.labelX - 20} ${v.labelY - 100}`} fill="none" stroke="#adc5ae" strokeWidth="1" />
              {Array.from({ length: terrain(region) === 'rock' ? 8 : 3 }, (_, i) => <use key={`m${i}`} href={`#${id}-mountain`} transform={`translate(${v.labelX - 52 + i * 17} ${v.labelY - 25 - Math.sin(i * 1.7 + index) * 13}) scale(${.55 + (i % 3) * .16})`} />)}
              {Array.from({ length: 17 }, (_, i) => <use key={`t${i}`} href={`#${id}-tree`} transform={`translate(${v.labelX - 58 + ((i * 29 + index * 13) % 116)} ${v.labelY + 28 + ((i * 17) % 43)}) scale(${.65 + (i % 3) * .13})`} />)}
              <path d={v.path} fill="none" stroke={color} strokeWidth="7" opacity=".65" />
            </g>
            <path d={v.path} className="region-hit" fill="transparent" stroke={selected ? '#fff0b2' : color} strokeWidth={selected ? 3 : 1.4} strokeDasharray={layer === 'information' && region.infoController === 'contested' ? '5 4' : undefined} role="button" tabIndex={0} aria-label={`${region.name}. ${owner}. Выбрать регион`} aria-pressed={selected} onClick={() => onSelectRegion(region.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectRegion(region.id); } }}>
              <title>{`${region.name}\n${region.type}\nДержава: ${owner}\nИнфоконтроль: ${region.infoController === 'contested' ? 'Спорный' : FACTIONS[region.infoController].name}\nУсталость: ${region.fatigue}%`}</title>
            </path>
            <g className="map-decoration"><City x={v.labelX} y={v.labelY - 3} capital={capital} color={COLORS[region.politicalOwner]} />
              <g transform={`translate(${v.labelX} ${v.labelY + 19})`}><rect x="-60" y="-10" width="120" height="21" rx="2" fill={selected ? '#2d403b' : '#182e32'} stroke={selected ? '#ebd59a' : '#9f9c78'} strokeWidth={selected ? 1.5 : .6} /><rect x="-60" y="-10" width="3" height="21" fill={COLORS[region.infoController]} /><text className="city-label" textAnchor="middle" y="4">{region.name.length > 20 ? region.name.slice(0, 18) + '…' : region.name}</text></g>
              <circle cx={v.labelX} cy={v.labelY + 37} r="3" fill={region.fatigue > 60 ? '#ed8c70' : region.fatigue > 30 ? '#e2c16f' : '#8fc9b2'} stroke="#223f39" />
              {fractured && <text x={v.labelX + 48} y={v.labelY - 8} className="fracture-mark">↯</text>}
              {Object.values(region.mediaNodes).some(n => n > 0) && <g transform={`translate(${v.labelX + 25} ${v.labelY - 8})`}><path d="M-4 0 L0 -20 L4 0 M-7 -16 Q0 -26 7 -16" fill="none" stroke="#f8e5a3" strokeWidth="1.4" /></g>}
            </g>
          </g>;
        })}
      </svg>
    </div>
    <div className="map-footer"><div className="map-factions">{(['atlas', 'meridian', 'concordat', 'neutral'] as const).map(faction => <span key={faction}><i style={{ background: COLORS[faction] }} />{faction === 'neutral' ? 'Нейтральные земли' : FACTIONS[faction].name}</span>)}</div><p>Границы — {layer === 'political' ? 'державы' : 'инфоконтроль'} · Полоса у названия — инфоконтроль · ↯ Разлом · Точка — усталость</p></div>
  </section>;
}
