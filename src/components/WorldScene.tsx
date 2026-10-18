import { useEffect, useRef, useState } from 'react';
import { FactionId } from '../game/types';
import { SEASONS, season } from '../game/realms';
import { Region } from '../game/types';
import { FACTIONS } from '../game/data';
import { createWorld, WorldApi } from '../world/createWorld';
import { FACTION_COLORS } from '../world/scenery';

type Props = { player?:FactionId;turn?:number;keyboardEnabled?:boolean; regions: Region[]; selectedRegionId: string | null; onSelectRegion: (id: string) => void; onCaptureReady?: (capture:(()=>string)|null)=>void };
export function WorldScene({ regions, selectedRegionId, onSelectRegion, onCaptureReady, player='atlas',turn=1,keyboardEnabled=true }: Props): JSX.Element {
  const host=useRef<HTMLDivElement>(null),api=useRef<WorldApi|null>(null);
  const [layer,setLayer]=useState<'political'|'information'>('information');
  const [compact,setCompact]=useState(()=>window.matchMedia('(max-width:700px)').matches||window.matchMedia('(pointer:coarse)').matches);
  const [interaction,setInteraction]=useState(false);
  const [error,setError]=useState(false),[ready,setReady]=useState(false);
  const [hovered,setHovered]=useState<string|null>(null),[announcement,setAnnouncement]=useState('');
  const latest=useRef({regions,selectedRegionId,onSelectRegion,layer,player});latest.current={regions,selectedRegionId,onSelectRegion,layer,player};
  useEffect(()=>{
    const container=host.current;if(!container)return;
    try{
      api.current=createWorld(container,latest.current,{
        select:id=>latest.current.onSelectRegion(id),hover:setHovered,announce:setAnnouncement,error:()=>setError(true)
      });api.current.setInteraction(!compact||interaction);onCaptureReady?.(api.current.capture);setReady(true);
    }catch(error){console.error('Could not create the island scene',error);setError(true);}
    return()=>{onCaptureReady?.(null);api.current?.dispose();api.current=null;};
  },[]);
  useEffect(()=>{api.current?.update({regions,selectedRegionId,layer,player});},[regions,selectedRegionId,layer,player]);
  useEffect(()=>{const query=window.matchMedia('(max-width:700px)'),coarse=window.matchMedia('(pointer:coarse)');const changed=()=>setCompact(query.matches||coarse.matches);query.addEventListener('change',changed);coarse.addEventListener('change',changed);return()=>{query.removeEventListener('change',changed);coarse.removeEventListener('change',changed);};},[]);
  useEffect(()=>{api.current?.setInteraction(!compact||interaction);},[compact,interaction]);
  useEffect(()=>{api.current?.setKeyboard(keyboardEnabled);},[keyboardEnabled,ready]);
  useEffect(()=>{if(ready)api.current?.focus();},[selectedRegionId,ready]);
  const hoveredRegion=regions.find(r=>r.id===hovered);
  return <section className="map-card atlas-map-shell refined-world">
    <div className="map-heading"><div><span className="map-eyebrow">АТЛАС · {regions.length} ГОРОДОВ</span><h2>Атлас трёх корон</h2></div><span className="world-location">{SEASONS[season(turn)]} · Ход {turn}<small>Вымышленный мир</small></span></div>
    <div className="map-toolbar world-toolbar"><div className="map-layer-switch" role="group" aria-label="Слой карты"><button aria-pressed={layer==='political'} onClick={()=>setLayer('political')}>Державы</button><button aria-pressed={layer==='information'} onClick={()=>setLayer('information')}>Инфоконтроль</button></div><span>WASD — перемещение · Выберите город справа</span><div className="map-zoom"><button onClick={()=>api.current?.focus()} disabled={!selectedRegionId}>К городу</button><button aria-label="Отдалить" onClick={()=>api.current?.zoom(1.2)}>−</button><button onClick={()=>api.current?.reset()}>Обзор</button><button aria-label="Приблизить" onClick={()=>api.current?.zoom(.8)}>+</button></div></div>
    {compact&&<div className="touch-toolbar"><button aria-pressed={interaction} onClick={()=>setInteraction(value=>!value)}>{interaction?'Листать страницу':'Вращать карту'}</button><span>{interaction?'Один палец — вращение, два — масштаб и сдвиг.':'Листайте страницу или коснитесь города.'}</span></div>}
    <div ref={host} className="world-viewport">
      {!ready&&!error&&<div className="world-loading">Открываем атлас…</div>}
      {error&&<p className="world-error">3D-карта недоступна. Попробуйте обновить страницу или включить аппаратное ускорение браузера. Выбирать города можно в списке ниже.</p>}
      <div className="world-compass" aria-hidden="true"><span>С</span><i>✧</i></div>
      <div className="world-caption">{hoveredRegion?`${hoveredRegion.name} · ${hoveredRegion.type}`:'Три материка · Серые нейтральные острова · Снега, долины, пустыни и тропики.'}</div>
      <div className={`world-announcement ${announcement?'visible':''}`} role="status">{announcement}</div>
    </div>
    <div className="map-footer"><div className="map-factions">{(['atlas','meridian','concordat'] as const).map(f=><span key={f}><i style={{background:FACTION_COLORS[f]}}/>{FACTIONS[f].name}</span>)}</div><p>Границы — {layer==='political'?'державы':'инфоконтроль'} · Флаг и полоса у города — инфоконтроль · WASD / стрелки — перемещение · Колесо — масштаб · Правая кнопка — сдвиг</p><details className="world-region-list"><summary>Все регионы</summary><div>{regions.map(r=><button key={r.id} aria-pressed={r.id===selectedRegionId} onClick={()=>onSelectRegion(r.id)}>{r.name}</button>)}</div></details></div>
  </section>;
}
