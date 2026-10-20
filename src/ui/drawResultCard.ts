import { QuickState, controlled, QUICK_TOTAL } from '../game/quickGame';
import { MAP_LANDS } from '../world/mapContours';
import { DIFFICULTIES } from '../game/information';
import { REALMS } from '../game/realms';
import { CITY_SITES } from '../world/terrain';
import { FACTION_COLORS } from '../world/scenery';

function fallbackMap(ctx:CanvasRenderingContext2D,game:QuickState):void {
  ctx.fillStyle='#21434e';ctx.fillRect(64,220,1072,410);
  const project=(x:number,z:number)=>({x:600+x*13,y:425+z*9});
  for(const land of MAP_LANDS){ctx.beginPath();land.points.forEach(([x,z],i)=>{const v=project(x,z);if(i)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);});ctx.closePath();ctx.fillStyle=land.faction==='neutral'?'#939c98':'#7f9368';ctx.fill();ctx.strokeStyle=FACTION_COLORS[land.faction];ctx.lineWidth=2;ctx.stroke();}
  CITY_SITES.forEach((p,i)=>{const v=project(p.x,p.y);ctx.beginPath();ctx.arc(v.x,v.y,8,0,Math.PI*2);ctx.fillStyle=FACTION_COLORS[game.regions[i].infoController];ctx.fill();ctx.strokeStyle='#f0dfad';ctx.lineWidth=2;ctx.stroke();});
}
function fittedText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,size:number,family='Georgia'):void {
  while(size>12){ctx.font=`${size}px ${family}`;if(ctx.measureText(text).width<=width)break;size--;}
  ctx.fillText(text,x,y);
}
export async function makeResultCard(game:QuickState,capture:(()=>string)|null):Promise<string> {
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  const gradient=ctx.createLinearGradient(0,0,1200,900);gradient.addColorStop(0,'#203b3e');gradient.addColorStop(1,'#0c222e');ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,900);
  ctx.strokeStyle='#b9a374';ctx.lineWidth=2;ctx.strokeRect(25,25,1150,850);
  ctx.fillStyle='#bfb38c';ctx.font='18px Trebuchet MS';ctx.fillText('СФЕРЫ ВЛИЯНИЯ  /  ТРИ МАТЕРИКА',64,76);
  ctx.textAlign='right';ctx.fillStyle=game.result==='win'?'#9fd4c3':'#d7b88a';ctx.fillText(game.result==='win'?'ПОБЕДА':'ПАРТИЯ ЗАВЕРШЕНА',1136,76);ctx.textAlign='left';
  ctx.fillStyle='#f4e5bd';fittedText(ctx,game.result==='win'?'Мир слушает вас':game.winner?`${REALMS[game.winner].name} выиграл гонку`:'Время для новой стратегии',64,147,1072,57);
  ctx.fillStyle='#b5c8b9';ctx.font='22px Trebuchet MS';ctx.fillText(game.result==='win'?(game.trust>=70?'Тихий дипломат':game.trust>=40?'Архитектор доверия':'Архитектор влияния'):'Исследователь трёх корон',64,190);
  let map:string|null=null;try{map=capture?.()??null;}catch{/* An illustrated map still produces a complete card. */}
  if(map){try{const image=new Image();image.src=map;await image.decode();ctx.drawImage(image,64,220,1072,410);}catch{fallbackMap(ctx,game);}}else fallbackMap(ctx,game);
  ctx.strokeStyle='#9caa8066';ctx.lineWidth=1;ctx.strokeRect(64,220,1072,410);
  const stats=[{value:`${controlled(game)} / ${QUICK_TOTAL}`,label:'ГОРОДОВ НА ВАШЕЙ СТОРОНЕ'},{value:String(game.turn),label:'ХОДОВ'},{value:`${game.trust}%`,label:'ДОВЕРИЕ'}];
  stats.forEach((stat,i)=>{const x=64+i*367;ctx.fillStyle='#f1e2b8';ctx.font='52px Georgia';ctx.fillText(stat.value,x,704);ctx.fillStyle='#9cb9ad';ctx.font='14px Trebuchet MS';ctx.fillText(stat.label,x,734);});
  ctx.strokeStyle='#a89b6544';ctx.beginPath();ctx.moveTo(64,766);ctx.lineTo(1136,766);ctx.stroke();
  ctx.fillStyle='#ecdba8';ctx.font='27px Georgia';ctx.fillText('Сможешь удержать информационное лидерство быстрее?',64,810);
  ctx.fillStyle='#a9c5b9';fittedText(ctx,`${DIFFICULTIES[game.difficulty].name} · ${REALMS[game.player].ruler} · Код карты: ${game.seed}`,64,847,1072,19,'Trebuchet MS');
  return canvas.toDataURL('image/png');
}
