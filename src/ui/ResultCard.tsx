import { useEffect, useState } from 'react';
import { QuickState } from '../game/quickGame';
import { makeResultCard } from './drawResultCard';
export function ResultCard({game,capture}:{game:QuickState;capture:(()=>string)|null}):JSX.Element {
  const [image,setImage]=useState(''),[failed,setFailed]=useState(false);
  useEffect(()=>{
    let cancelled=false,objectUrl:string|null=null;setImage('');setFailed(false);
    void makeResultCard(game,capture).then(url=>{
      if(cancelled)return;
      const binary=atob(url.split(',')[1]),bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      objectUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));setImage(objectUrl);
    }).catch(()=>{if(!cancelled)setFailed(true);});
    return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[game,capture]);
  return <div className="result-card">{image?<><img src={image} alt={`Карточка результата: ${game.result==='win'?'победа':'партия завершена'}, карта ${game.seed}, ход ${game.turn}`}/><a href={image} download={`spheres-${game.seed}-turn-${game.turn}.png`} className="download-card">Скачать карточку PNG</a></>:<p role="status">{failed?'Не удалось создать картинку. Результатом можно поделиться текстом.':'Рисуем вашу карточку…'}</p>}</div>;
}
