import * as THREE from 'three';

import { MAP_LANDS } from './mapContours';
export function randomGenerator(seed = 72): () => number {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const smooth = THREE.MathUtils.smoothstep;
const polygons=MAP_LANDS.map(land=>({faction:land.faction,points:land.points.map(([x,z])=>new THREE.Vector2(x,z)),minX:Math.min(...land.points.map(p=>p[0])),maxX:Math.max(...land.points.map(p=>p[0])),minZ:Math.min(...land.points.map(p=>p[1])),maxZ:Math.max(...land.points.map(p=>p[1]))}));
function polygonDistance(x:number,z:number,poly:typeof polygons[number]):number {
  let inside=false,distance=Infinity;
  poly.points.forEach((a,i)=>{const b=poly.points[(i+1)%poly.points.length];
    if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)inside=!inside;
    const dx=b.x-a.x,dz=b.y-a.y,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz||1),0,1);
    distance=Math.min(distance,Math.hypot(x-a.x-t*dx,z-a.y-t*dz));
  });return inside?distance:-distance;
}
export function coastDistance(x:number,z:number):number {
  let best=-100;
  for(const poly of polygons){const boxDistance=Math.hypot(Math.max(poly.minX-x,0,x-poly.maxX),Math.max(poly.minZ-z,0,z-poly.maxZ));if(boxDistance>Math.max(0,-best))continue;best=Math.max(best,polygonDistance(x,z,poly));}
  return best;
}
export function isNeutralLand(x:number,z:number):boolean {return polygons.some(p=>p.faction==='neutral'&&x>=p.minX&&x<=p.maxX&&z>=p.minZ&&z<=p.maxZ&&polygonDistance(x,z,p)>0);}
const chosen=[...polygons.filter(p=>p.faction==='atlas').filter((_,i)=>[1,5,6,7].includes(i)),...([4,2,0,1].map(i=>polygons.filter(p=>p.faction==='meridian')[i])),...([5,4,0,3].map(i=>polygons.filter(p=>p.faction==='concordat')[i])),...polygons.filter(p=>p.faction==='neutral')];
export const CITY_SITES=chosen.map(poly=>{
  let best=new THREE.Vector2(),depth=-Infinity;
  for(let x=poly.minX;x<poly.maxX;x+=.3)for(let z=poly.minZ;z<poly.maxZ;z+=.3){const d=polygonDistance(x,z,poly);if(d>depth){depth=d;best.set(x,z);}}
  return best;
});
export const TERRITORIES=chosen.map(p=>p.points);
export const COAST=polygons.flatMap(p=>p.points);
export function climateAt(x:number,z:number):'polar'|'temperate'|'arid'|'tropical' {
  if(z< -10)return 'polar';
  if(z>7)return x>15?'tropical':'arid';
  return 'temperate';
}
export type RiverPoint = { x: number; z: number; bed: number };
function river(points: number[][]): RiverPoint[] {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z, bed]) => new THREE.Vector3(x, bed, z)));
  return curve.getPoints(100).map(p => ({ x: p.x, z: p.z, bed: p.y }));
}
export const RIVERS = CITY_SITES.filter((_,i)=>i===2||i===5||i===9).map(p=>river([[p.x,p.y-1.5,1.1],[p.x+.7,p.y,.8],[p.x+1,p.y+1.5,.45],[p.x+2,p.y+3,.1],[p.x+3,p.y+4,-.15]]));
export function channel(x: number, z: number): { distance: number; bed: number } {
  let distance = Infinity, bed = 0;
  for (const path of RIVERS) for (let i = 1; i < path.length; i++) {
    const a = path[i-1], b = path[i], dx = b.x-a.x, dz = b.z-a.z;
    const t = THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
    const d = Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
    if (d < distance) { distance = d; bed = a.bed+(b.bed-a.bed)*t; }
  }
  return { distance, bed };
}
function noise(x: number, z: number): number {
  return Math.sin(x*.36+Math.cos(z*.3))*Math.cos(z*.46+x*.12)*.36 + Math.sin(x*1.1-z*.85)*.1 + Math.cos(x*2.7+z*1.7)*.035;
}
const peaks = [ [-10,-6,4.4,3.8,1.9], [-4,-5,5.4,3.2,2.2], [3,-5,4.9,2.7,1.9], [11,-4,4.3,3.4,2], [14,4,2.6,2.7,2], [-22,-5,2.5,2,1.9] ];
function rawHeight(x: number,z: number): number {
  const d = coastDistance(x,z);
  if (d < -.7) return -1.5-Math.min(4,-d*.3);
  let h = 1.05 + noise(x,z);
  for (const [px,pz,height,sx,sz] of peaks) {
    const dx=(x-px)/sx,dz=(z-pz)/sz;
    h += Math.exp(-(dx*dx+dz*dz)*.65)*height*1.12*(.68+.32*Math.pow(1-Math.abs(Math.sin(x*1.15+z*.78)),2));
  }
  return -.3 + smooth(d,-.25,1.15)*h;
}
const cityLevels = CITY_SITES.map(p => Math.max(.9,rawHeight(p.x,p.y)));
export function heightAt(x: number, z: number): number {
  let h = rawHeight(x,z);
  if (coastDistance(x,z) < -.7) return h;
  const water = channel(x,z);
  if (water.distance < 1.5) h = THREE.MathUtils.lerp(Math.min(h,water.bed-.13),h,smooth(water.distance,.24,1.5));
  CITY_SITES.forEach((p,i) => {
    const d = Math.hypot(x-p.x,z-p.y);
    if(d<2.8) h=THREE.MathUtils.lerp(cityLevels[i],h,smooth(d,1.65,2.8));
  });
  return h;
}
export function nearestCity(x: number,z: number): number {
  let index=0, distance=Infinity;
  CITY_SITES.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-z)**2;if(d<distance){distance=d;index=i;}});
  return index;
}
export function terrainGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(76,48,260,165); geo.rotateX(-Math.PI/2);
  const positions=geo.attributes.position, colors:number[]=[];
  const grass=new THREE.Color('#799060'), forest=new THREE.Color('#3c6248'), sand=new THREE.Color('#d6c395'), rock=new THREE.Color('#777f79'), snow=new THREE.Color('#e3e9e4');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),h=heightAt(x,z);positions.setY(i,h);
    const climate=climateAt(x,z);
    const d=coastDistance(x,z), c=grass.clone().lerp(forest,THREE.MathUtils.clamp(.35+noise(x*.6,z*.6),0,1));
    if(climate==='polar')c.lerp(snow,.72);
    if(climate==='arid')c.lerp(new THREE.Color('#c3a36c'),.8);
    if(climate==='tropical')c.lerp(forest,.7);
    if(d<2)c.lerp(sand,1-smooth(d,.4,2));
    if(h>2.2)c.lerp(rock,smooth(h,2.2,4.2));
    if(h>4.1)c.lerp(snow,smooth(h,4.1,5.8));
    if(channel(x,z).distance<.85)c.lerp(forest,.25);
    if(isNeutralLand(x,z)&&d>0)c.set('#939c98').multiplyScalar(.85+Math.min(h,3)*.06);
    c.multiplyScalar(.93+.07*Math.sin(x*4.1+z*3.3)); colors.push(c.r,c.g,c.b);
  }
  geo.computeVertexNormals();
  const normals=geo.attributes.normal,cliff=new THREE.Color('#6c756c');
  for(let i=0;i<positions.count;i++){const slope=1-Math.max(0,normals.getY(i)),h=positions.getY(i);if(h>.3){const c=new THREE.Color(colors[i*3],colors[i*3+1],colors[i*3+2]);c.lerp(cliff,smooth(slope,.23,.7)*.7);const strata=.96+.04*Math.sin(h*17+positions.getX(i)*.24);c.multiplyScalar(strata);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geo;
}
export function ribbon(points: THREE.Vector3[],width:number): THREE.BufferGeometry {
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  points.forEach((p,i)=>{
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const dx=next.x-prev.x,dz=next.z-prev.z,length=Math.hypot(dx,dz)||1;
    positions.push(p.x-dz/length*width/2,p.y,p.z+dx/length*width/2,p.x+dz/length*width/2,p.y,p.z-dx/length*width/2);
    uvs.push(0,i/points.length,1,i/points.length);
    if(i<points.length-1)indices.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);
  });
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
export function roadPaths(): THREE.Vector3[][] {
  const paths:THREE.Vector3[][]=[];
  CITY_SITES.slice(0,12).forEach((site,i)=>{
    const start=Math.floor(i/4)*4; const adjacent=i%4<3?[i+1]:[start];
    adjacent.forEach(j=>{
      const other=CITY_SITES[j],mid=site.clone().lerp(other,.5);mid.x+=Math.sin(i+j)*.7;mid.y+=Math.cos(i+j)*.8;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(site.x,0,site.y),new THREE.Vector3(mid.x,0,mid.y),new THREE.Vector3(other.x,0,other.y)]);
      const samples=curve.getPoints(50);let segment:THREE.Vector3[]=[];for(const p of samples){if(coastDistance(p.x,p.z)<0){if(segment.length>1)paths.push(segment);segment=[];continue;}const water=channel(p.x,p.z);p.y=Math.max(heightAt(p.x,p.z)+.045,water.distance<.6?water.bed+.24:-99);segment.push(p);}if(segment.length>1)paths.push(segment);
    });
  });return paths;
}
