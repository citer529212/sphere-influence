export type DeviceHints={width:number;height:number;coarse:boolean;pixelRatio:number;memory?:number;saveData?:boolean};
export function deviceHints():DeviceHints{
 const nav=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
 return {width:window.innerWidth,height:window.innerHeight,coarse:window.matchMedia('(pointer:coarse)').matches,pixelRatio:window.devicePixelRatio||1,memory:nav.deviceMemory,saveData:nav.connection?.saveData};
}
export function compactDevice(hints:DeviceHints){return hints.coarse||hints.width<=700;}
export function renderProfile(hints:DeviceHints){
 const economy=compactDevice(hints)||!!hints.saveData||(hints.memory!==undefined&&hints.memory<=2);
 return {economy,pixelRatio:Math.min(hints.pixelRatio,economy?1:1.5),fps:economy?30:60,shadows:!economy,terrainSegments: economy?[168,106] as const:[260,165] as const,waterSegments:economy?24:90,shoreSize:economy?96:192};
}
