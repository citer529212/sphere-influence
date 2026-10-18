import { ReactNode, useEffect, useRef } from 'react';
export function Modal({titleId,onClose,children,className=''}:{titleId:string;onClose:()=>void;children:ReactNode;className?:string}):JSX.Element {
  const panel=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    panel.current?.querySelector<HTMLElement>('button,a[href],textarea')?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();onClose();}
      if(event.key!=='Tab')return;
      const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea,input')??[]);
      const first=nodes[0],last=nodes.at(-1);if(!first)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',key);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus();};
  },[onClose]);
  return <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}><div ref={panel} className={`result-box ${className}`}>{children}</div></div>;
}
