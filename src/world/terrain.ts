import * as THREE from 'three';

export const CITY_SITES = Array.from({ length: 12 }, (_, i) => new THREE.Vector2(
  (-300 + (i % 4) * 200 + Math.sin(i * 2.3) * 32) * .065,
  (-160 + Math.floor(i / 4) * 160 + Math.cos(i * 1.7) * 25) * .065
));
export function randomGenerator(seed = 72): () => number {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const smooth = THREE.MathUtils.smoothstep;
export function coastRadius(a: number): number { return 1 + .055 * Math.sin(a * 7) + .035 * Math.cos(a * 11) + .025 * Math.sin(a * 3); }
export function coastDistance(x: number, z: number): number {
  const nx = x / 31, nz = z / 17;
  return (coastRadius(Math.atan2(nz, nx)) - Math.hypot(nx, nz)) * 17;
}
export const COAST = Array.from({ length: 160 }, (_, i) => {
  const a = i / 160 * Math.PI * 2, r = coastRadius(a);
  return new THREE.Vector2(Math.cos(a) * 31 * r, Math.sin(a) * 17 * r);
});
export const TERRITORIES = CITY_SITES.map((site, index) => {
  let points = COAST.map(p => p.clone());
  CITY_SITES.forEach((other, j) => {
    if (index === j) return;
    const normal = other.clone().sub(site), limit = (other.lengthSq() - site.lengthSq()) / 2;
    const clipped: THREE.Vector2[] = [];
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length], da = a.dot(normal) - limit, db = b.dot(normal) - limit;
      if (da <= 0) clipped.push(a);
      if (da * db < 0) clipped.push(a.clone().lerp(b, da / (da - db)));
    });
    points = clipped;
  });
  return points;
});

export type RiverPoint = { x: number; z: number; bed: number };
function river(points: number[][]): RiverPoint[] {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z, bed]) => new THREE.Vector3(x, bed, z)));
  return curve.getPoints(100).map(p => ({ x: p.x, z: p.z, bed: p.y }));
}
export const RIVERS = [
  river([[0,-5,1.4],[1,-2,1.15],[-.7,2,.9],[.5,5,.65],[-1,9,.35],[1,13,.06],[3,18,-.15]]),
  river([[-8,-5,1.2],[-12,-4,.95],[-15,-1,.7],[-17,3,.45],[-23,5,.1],[-31,7,-.15]])
];
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
    h += Math.exp(-(dx*dx+dz*dz)*.65)*height*(.83+.17*Math.sin(x*2+z*1.3));
  }
  return -.3 + smooth(d,-.7,2.5)*h;
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
  const geo = new THREE.PlaneGeometry(76,48,190,120); geo.rotateX(-Math.PI/2);
  const positions=geo.attributes.position, colors:number[]=[];
  const grass=new THREE.Color('#77945d'), forest=new THREE.Color('#486f50'), sand=new THREE.Color('#c8bb89'), rock=new THREE.Color('#8d9183'), snow=new THREE.Color('#d9ded3');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),h=heightAt(x,z);positions.setY(i,h);
    const d=coastDistance(x,z), c=grass.clone().lerp(forest,THREE.MathUtils.clamp(.35+noise(x*.6,z*.6),0,1));
    if(d<2)c.lerp(sand,1-smooth(d,.4,2));
    if(h>2.2)c.lerp(rock,smooth(h,2.2,4.2));
    if(h>4.1)c.lerp(snow,smooth(h,4.1,5.8));
    if(channel(x,z).distance<.85)c.lerp(forest,.25);
    c.multiplyScalar(.93+.07*Math.sin(x*4.1+z*3.3)); colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
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
  CITY_SITES.forEach((site,i)=>{
    const adjacent=[...(i%4<3?[i+1]:[]),...(i<8?[i+4]:[])];
    adjacent.forEach(j=>{
      const other=CITY_SITES[j],mid=site.clone().lerp(other,.5);mid.x+=Math.sin(i+j)*.7;mid.y+=Math.cos(i+j)*.8;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(site.x,0,site.y),new THREE.Vector3(mid.x,0,mid.y),new THREE.Vector3(other.x,0,other.y)]);
      paths.push(curve.getPoints(50).map(p=>{const river=channel(p.x,p.z);p.y=Math.max(heightAt(p.x,p.z)+.045,river.distance<.6?river.bed+.24:-99);return p;}));
    });
  });return paths;
}
