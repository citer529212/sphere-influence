// A real tap must reach play() synchronously; awaiting decoded music loses activation on mobile.
export function playVideo(element:{play:()=>Promise<void>},prepare:(()=>Promise<void>)|undefined,current:()=>boolean,manual=false):Promise<void>{
 const warm=()=>{try{return prepare?.().catch(()=>undefined)??Promise.resolve();}catch{return Promise.resolve();}};
 if(!current())return Promise.resolve();
 if(manual){try{const playing=element.play();void warm();return playing;}catch(error){return Promise.reject(error);}}
 if(!prepare){try{return element.play();}catch(error){return Promise.reject(error);}}
 return new Promise<void>(resolve=>{const timer=setTimeout(resolve,2000);void warm().finally(()=>{clearTimeout(timer);resolve();});}).then(()=>current()?element.play():undefined);
}
export function videoFinished(time:number,duration:number):boolean{return Number.isFinite(duration)&&duration>0&&Number.isFinite(time)&&time>=duration-.12;}
