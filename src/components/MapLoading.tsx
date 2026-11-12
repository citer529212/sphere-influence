import type { DifficultyId } from '../game/information';
import type { Region } from '../game/types';
import { MAP_PRESENTATION } from '../game/mapPresentation';
import { INTRO_POSTER } from '../ui/cinematicAssets';

export function AtlasLoading({difficulty,phase}:{
  difficulty:DifficultyId;
  phase:'assets'|'terrain';
}): JSX.Element {
  return <div className="atlas-loading" role="status">
    <img src={INTRO_POSTER} alt="" />
    <div className="atlas-loading-copy">
      <h2>{MAP_PRESENTATION[difficulty].name}</h2>
      <p>{phase==='assets'?'Загружаем 3D-карту…':'Строим рельеф и расставляем города…'}</p>
      <div className="atlas-loading-track"><progress aria-label="Загрузка карты" /><i aria-hidden="true" /></div>
    </div>
  </div>;
}

export function MapLoading({regions,onSelect,difficulty,failed=false}:{
  regions:Region[];onSelect:(id:string)=>void;difficulty:DifficultyId;failed?:boolean;
}): JSX.Element {
  if(!failed)return <AtlasLoading difficulty={difficulty} phase="assets"/>;
  return <section className="map-card map-loading-card">
    <h2>3D-карта пока недоступна</h2>
    <p>Партия сохранена. Вы можете выбрать город из списка.</p>
    <button onClick={()=>window.location.reload()}>Повторить загрузку</button>
    <div className="loading-city-list" aria-label="Города трёх материков">
      {regions.map(region=><button key={region.id} onClick={()=>onSelect(region.id)}>{region.name}</button>)}
    </div>
  </section>;
}
