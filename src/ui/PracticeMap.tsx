import type { QuickState } from '../game/quickGame';
import { cityIndex, worldLinks } from '../game/worlds';
import { REALMS } from '../game/realms';
import { STANDARD_LAYOUT } from '../world/mapLayouts';

type Props = {
  game: QuickState;
  selected: string;
  reachable: Set<number>;
  network: boolean;
  busy: boolean;
  cue: { id: string; serial: number; delta: number } | null;
  required: (id: string) => boolean;
  onSelect: (id: string) => void;
};

const site = (id: string) => STANDARD_LAYOUT.sites[cityIndex({id})];

export function PracticeMap({game,selected,reachable,network,busy,cue,required,onSelect}:Props) {
  const links = network ? worldLinks(game) : [];
  return <div className="practice-atlas" role="group" aria-label="Выбрать учебный город">
    <svg viewBox="-38 -23 76 46" preserveAspectRatio="none" aria-hidden="true">
      {STANDARD_LAYOUT.lands.map(({faction,points}, index) =>
        <polygon key={index} points={points.map(point=>point.join(',')).join(' ')}
          fill={faction==='neutral'?'#778680':REALMS[faction].color} />)}
      {links.map(([a,b])=>{
        const [x1,y1]=site(game.regions[a].id);
        const [x2,y2]=site(game.regions[b].id);
        return <line key={`${a}:${b}`} x1={x1} y1={y1} x2={x2} y2={y2} className={reachable.has(a)&&reachable.has(b)?'practice-route active':'practice-route'}/>;
      })}
    </svg>
    {game.regions.map((region,index)=>{
      const [x,z]=site(region.id);
      const color=region.infoController==='contested'?'#a8b6ae':REALMS[region.infoController].color;
      return <button key={region.id} type="button" data-required={required(region.id)}
        aria-label={`${region.name} · поддержка ${region.influence[game.player]}%${network?(reachable.has(index)?' · в охвате':' · вне охвата'):''}`}
        title={region.name} aria-pressed={region.id===selected} disabled={busy} onClick={()=>onSelect(region.id)}
        className={network&&!reachable.has(index)?'practice-pin outside':'practice-pin'}
        style={{left:`${(x+38)/76*100}%`,top:`${(z+23)/46*100}%`,color}}>
        <i aria-hidden="true"/>
        {region.id===selected&&<span className="practice-pin-caption" aria-hidden="true">{region.name}</span>}
        {cue?.id===region.id&&<span className="practice-pin-effect" key={cue.serial} aria-hidden="true">
          {cue.delta===0?'◎':`${cue.delta>0?'+':''}${cue.delta}`}
        </span>}
      </button>;
    })}
  </div>;
}
