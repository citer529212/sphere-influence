import * as THREE from 'three';

import { MAP_LANDS } from './mapContours';
import { EASY_SCALE, EXPERT_LAYOUT, STANDARD_LAYOUT, type Land, type Point } from './mapLayouts';
import type { DifficultyId } from '../game/information';
import { CITY_CLIMATES } from '../game/realms';
export function randomGenerator(seed = 72): () => number {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const smooth = THREE.MathUtils.smoothstep;
const easyLands: Land[] = MAP_LANDS.filter(land =>
  land.faction !== 'neutral' || land.points.some(([, z]) => z < 17),
).map(land => ({faction: land.faction, points: land.points.map(([x,z]) => [x * EASY_SCALE, z * EASY_SCALE])}));
const preparePolygons=(lands:readonly Land[])=>lands.map(land=>({faction:land.faction,points:land.points.map(([x,z])=>new THREE.Vector2(x,z)),minX:Math.min(...land.points.map(p=>p[0])),maxX:Math.max(...land.points.map(p=>p[0])),minZ:Math.min(...land.points.map(p=>p[1])),maxZ:Math.max(...land.points.map(p=>p[1]))}));
function polygonDistance(x:number,z:number,poly:ReturnType<typeof preparePolygons>[number]):number {
  let inside=false,distance=Infinity;
  poly.points.forEach((a,i)=>{const b=poly.points[(i+1)%poly.points.length];
    if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)inside=!inside;
    const dx=b.x-a.x,dz=b.y-a.y,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz||1),0,1);
    distance=Math.min(distance,Math.hypot(x-a.x-t*dx,z-a.y-t*dz));
  });return inside?distance:-distance;
}
const polygons=preparePolygons(MAP_LANDS);
const chosen=[...polygons.filter(p=>p.faction==='atlas').filter((_,i)=>[1,5,6,7].includes(i)),...([4,2,0,1].map(i=>polygons.filter(p=>p.faction==='meridian')[i])),...([5,4,0,3].map(i=>polygons.filter(p=>p.faction==='concordat')[i])),...polygons.filter(p=>p.faction==='neutral').slice(0,4)];
const area=(poly:ReturnType<typeof preparePolygons>[number])=>Math.abs(poly.points.reduce((sum,a,i)=>{const b=poly.points[(i+1)%poly.points.length];return sum+a.x*b.y-b.x*a.y;},0));
const extraChosen=(['atlas','meridian','concordat'] as const).flatMap(f=>polygons.filter(p=>p.faction===f&&!chosen.includes(p)).sort((a,b)=>area(b)-area(a)).slice(0,2));
const frontier=polygons.filter(p=>p.faction==='neutral').slice(4);
export const ALL_TERRITORIES=[...chosen,...extraChosen,...frontier].map(p=>p.points);
export const ALL_CITY_SITES=[...chosen,...extraChosen,...frontier].map(poly=>{
  let best=new THREE.Vector2(),depth=-Infinity;
  for(let x=poly.minX;x<poly.maxX;x+=.3)for(let z=poly.minZ;z<poly.maxZ;z+=.3){const d=polygonDistance(x,z,poly);if(d>depth){depth=d;best.set(x,z);}}
  return best;
});
export const CITY_SITES=ALL_CITY_SITES.slice(0,16);
export const TERRITORIES=ALL_TERRITORIES.slice(0,16);
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
function noise(x: number, z: number): number {
  return Math.sin(x*.36+Math.cos(z*.3))*Math.cos(z*.46+x*.12)*.36 + Math.sin(x*1.1-z*.85)*.1 + Math.cos(x*2.7+z*1.7)*.035;
}
// Connected spines with branching foothills, anchored to each mainland.
export const RIDGES = [
  [[-28,-12],[-23,-7],[-18,-3],[-12,-2]],
  [[-9,-9],[-4,-6],[3,-5],[10,-2],[13,4]],
  [[21,-13],[24,-7],[25,-1],[24,5],[26,10]]
] as const;
export function ridgeHeight(x:number,z:number,ridges:readonly (readonly Point[])[]=RIDGES):number {
  let height=0;
  for(const ridge of ridges)for(let i=1;i<ridge.length;i++){
    const a=ridge[i-1],b=ridge[i],dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
    const distance=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t),fold=.78+.22*Math.cos((x+z)*2.1);
    height=Math.max(height,Math.exp(-distance*distance/3.1)*3.5*fold+Math.exp(-distance*distance/15)*.65);
  }
  return height;
}
export function climateWeights(x:number,z:number){
  const polar=1-smooth(z+Math.sin(x*.2)*.65,-12,-8),south=smooth(z+Math.sin(x*.19)*.6,5,10),tropical=south*smooth(x,12,18);
  return {polar,arid:south-tropical,tropical,temperate:1-polar-south};
}
export function nearestCity(x: number,z: number,sites=CITY_SITES): number {
  let index=0, distance=Infinity;
  sites.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-z)**2;if(d<distance){distance=d;index=i;}});
  return index;
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

function createTerrain(
  lands: readonly Land[],
  sites: THREE.Vector2[],
  territories: THREE.Vector2[][],
  relief = 1,
  ridges: readonly (readonly Point[])[] = RIDGES,
  grassColor = '#799060',
  plateaus = false,
  alignCityClimates = false,
) {
  const polygons = preparePolygons(lands);
  function coastDistance(x:number,z:number):number {
    let best=-100;
    for(const poly of polygons){const boxDistance=Math.hypot(Math.max(poly.minX-x,0,x-poly.maxX),Math.max(poly.minZ-z,0,z-poly.maxZ));if(boxDistance>Math.max(0,-best))continue;best=Math.max(best,polygonDistance(x,z,poly));}
    return best;
  }
  function isNeutralLand(x:number,z:number):boolean {return polygons.some(p=>p.faction==='neutral'&&x>=p.minX&&x<=p.maxX&&z>=p.minZ&&z<=p.maxZ&&polygonDistance(x,z,p)>0);}
  const RIVERS = sites.slice(0,16).filter((_,i)=>i===2||i===5||i===9).map(p=>river([[p.x,p.y-1.5,1.1 * relief],[p.x+.7,p.y,.8],[p.x+1,p.y+1.5,.45],[p.x+2,p.y+3,.1],[p.x+3,p.y+4,-.15]]));
  function channel(x: number, z: number): { distance: number; bed: number } {
    let distance = Infinity, bed = 0;
    for (const path of RIVERS) for (let i = 1; i < path.length; i++) {
      const a = path[i-1], b = path[i], dx = b.x-a.x, dz = b.z-a.z;
      const t = THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
      const d = Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
      if (d < distance) { distance = d; bed = a.bed+(b.bed-a.bed)*t; }
    }
    return { distance, bed };
  }
  function rawHeight(x: number,z: number,d = coastDistance(x,z)): number {
    if (d < -.7) return -1.5-Math.min(4,-d*.3);
    let h = 1.05 + noise(x,z) * relief;
    const ridge = ridgeHeight(x,z,ridges) * relief;
    h += plateaus ? Math.min(5.3, ridge + .95 * smooth(ridge, 1.1, 2.8)) : ridge;
    return -.3 + smooth(d,-.25,1.15)*h;
  }
  const cityLevels = sites.map(p => Math.max(.9,rawHeight(p.x,p.y)));
  function heightAt(x: number, z: number, d = coastDistance(x,z), sample?: ReturnType<typeof channel>): number {
    let h = rawHeight(x,z,d);
    if (d < -.7) return h;
    const water = sample ?? channel(x,z);
    if (water.distance < 2.1) h = THREE.MathUtils.lerp(Math.min(h,water.bed-.13),h,smooth(water.distance,.24,2.1));
    sites.forEach((p,i) => {
      const d = Math.hypot(x-p.x,z-p.y);
      if(d<2.8) h=THREE.MathUtils.lerp(cityLevels[i],h,smooth(d,1.65,2.8));
    });
    return h;
  }
  function localClimateWeights(x:number,z:number) {
    const weights = climateWeights(x,z);
    if (!alignCityClimates) return weights;
    const index = nearestCity(x,z,sites);
    const site = sites[index];
    const mix = 1 - smooth(Math.hypot(site.x-x,site.y-z), 1.4, 5.5);
    const local = CITY_CLIMATES[index];
    for (const zone of Object.keys(weights) as (keyof typeof weights)[])
      weights[zone] = THREE.MathUtils.lerp(weights[zone], Number(zone===local), mix);
    return weights;
  }
  function mapClimateAt(x:number,z:number): ReturnType<typeof climateAt> {
    const weights = localClimateWeights(x,z);
    return (Object.keys(weights) as (keyof typeof weights)[]).reduce((best,zone)=>weights[zone]>weights[best]?zone:best);
  }
  function terrainGeometry(segmentsX=260,segmentsZ=165): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(76,48,segmentsX,segmentsZ); geo.rotateX(-Math.PI/2);
    const positions=geo.attributes.position, colors:number[]=[];
    const grass=new THREE.Color(grassColor), forest=new THREE.Color('#3c6248'), sand=new THREE.Color('#d6c395'), rock=new THREE.Color('#777f79'), snow=new THREE.Color('#e3e9e4');
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i),d=coastDistance(x,z);
      const water=d>=-.7?channel(x,z):null;
      const h=heightAt(x,z,d,water??undefined);positions.setY(i,h);
      const weights=localClimateWeights(x,z);
      const c=grass.clone().lerp(forest,THREE.MathUtils.clamp(.35+noise(x*.6,z*.6),0,1));
      c.lerp(snow,weights.polar*.72);
      c.lerp(new THREE.Color('#c3a36c'),weights.arid*.8);
      c.lerp(forest,weights.tropical*.7);
      if(d<2)c.lerp(sand,1-smooth(d,.4,2));
      if(h>2.2)c.lerp(rock,smooth(h,2.2,4.2));
      if(h>4.1)c.lerp(snow,smooth(h,4.1,5.8));
      if(water&&water.distance<.85)c.lerp(forest,.25);
      if(isNeutralLand(x,z)&&d>0)c.set('#939c98').multiplyScalar(.85+Math.min(h,3)*.06);
      c.multiplyScalar(.93+.07*Math.sin(x*4.1+z*3.3)); colors.push(c.r,c.g,c.b);
    }
    geo.computeVertexNormals();
    const normals=geo.attributes.normal,cliff=new THREE.Color('#6c756c');
    for(let i=0;i<positions.count;i++){const slope=1-Math.max(0,normals.getY(i)),h=positions.getY(i);if(h>.3){const c=new THREE.Color(colors[i*3],colors[i*3+1],colors[i*3+2]);c.lerp(cliff,smooth(slope,.23,.7)*.7);const strata=.96+.04*Math.sin(h*17+positions.getX(i)*.24);c.multiplyScalar(strata);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}}
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geo;
  }
  function roadPaths(sites=CITY_SITES,owners=sites.map((_,i)=>i<12?String(Math.floor(i/4)):'neutral')): THREE.Vector3[][] {
    const paths:THREE.Vector3[][]=[];
    sites.forEach((site,i)=>{
      if(owners[i]==='neutral')return;
      const group=sites.map((_,j)=>j).filter(j=>owners[j]===owners[i]);const adjacent=[group[(group.indexOf(i)+1)%group.length]];
      adjacent.forEach(j=>{
        const other=sites[j],mid=site.clone().lerp(other,.5);mid.x+=Math.sin(i+j)*.7;mid.y+=Math.cos(i+j)*.8;
        const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(site.x,0,site.y),new THREE.Vector3(mid.x,0,mid.y),new THREE.Vector3(other.x,0,other.y)]);
        const samples=curve.getPoints(50);let segment:THREE.Vector3[]=[];for(const p of samples){if(coastDistance(p.x,p.z)<0){if(segment.length>1)paths.push(segment);segment=[];continue;}const water=channel(p.x,p.z);p.y=Math.max(heightAt(p.x,p.z)+.045,water.distance<.6?water.bed+.24:-99);segment.push(p);}if(segment.length>1)paths.push(segment);
      });
    });return paths;
  }
  return {lands, sites, territories, RIVERS, channel, coastDistance, heightAt, terrainGeometry, roadPaths, isNeutralLand, climateAt:alignCityClimates?mapClimateAt:climateAt};
}
export type Terrain = ReturnType<typeof createTerrain>;
export const DEFAULT_TERRAIN = createTerrain(MAP_LANDS, ALL_CITY_SITES, ALL_TERRITORIES);
export const { RIVERS, channel, coastDistance, heightAt, terrainGeometry, roadPaths, isNeutralLand } = DEFAULT_TERRAIN;

const STANDARD_RIDGES: readonly Point[][] = [
  [[-30,-13],[-25,-11],[-27,-4],[-24,7]],
  [[-5,-13],[-3,-8],[1,-5],[5,5]],
  [[24,-10],[27,-5],[26,2],[24,12]],
];
const EXPERT_RIDGES: readonly Point[][] = [
  [[-32,-17],[-26,-14],[-20,-14],[-23,-8],[-27,-1],[-28,6]],
  [[-6,-14],[1,-12],[6,-7],[2,-1],[4,6],[-1,11]],
  [[19,-16],[27,-13],[30,-7],[25,-2],[29,6],[23,13],[19,16]],
];
export function terrainFor(difficulty: DifficultyId): Terrain {
  if (difficulty === 'discovery') {
    const scale = (p: THREE.Vector2) => p.clone().multiplyScalar(EASY_SCALE);
    return createTerrain(easyLands, ALL_CITY_SITES.map(scale), ALL_TERRITORIES.map(points => points.map(scale)), .53,
      RIDGES.map(ridge => ridge.map(([x,z]) => [x * EASY_SCALE,z * EASY_SCALE] as const)), '#91a873', false, true);
  }
  const { lands, sites, territories } = difficulty === 'expert' ? EXPERT_LAYOUT : STANDARD_LAYOUT;
  const point = ([x,z]: Point) => new THREE.Vector2(x,z);
  const expert = difficulty === 'expert';
  return createTerrain(lands, sites.map(point), territories.map(points => points.map(point)), expert ? 1.68 : 1.13,
    expert ? EXPERT_RIDGES : STANDARD_RIDGES, expert ? '#627e66' : '#799762', expert, true);
}
