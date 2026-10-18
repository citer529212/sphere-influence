import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CITY_SITES, climateAt, isNeutralLand, channel, coastDistance, heightAt, randomGenerator, ribbon } from './terrain';
import { Region } from '../game/types';

export const FACTION_COLORS = { atlas:'#4baff5',meridian:'#ed6259',concordat:'#efd05d',neutral:'#939c98',contested:'#939c98' };
export const material = (color:THREE.ColorRepresentation,roughness=.88) => new THREE.MeshStandardMaterial({color,roughness});
const box = new THREE.BoxGeometry(1,1,1);
const cylinder = new THREE.CylinderGeometry(1,1,1,12);
const cone = new THREE.ConeGeometry(1,1,4);
const dome = new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI/2);
const shapes = [box,cylinder,cone,dome];
export function sharedAssetGeometries(): THREE.BufferGeometry[] { return shapes; }
function piece(group:THREE.Group,geometry:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,rotation=0):THREE.Mesh {
  const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
export function cityModel(region:Region,index:number):THREE.Group {
  const group=new THREE.Group(),random=randomGenerator(400+index);
  const walls=material('#d5c8a3'),trim=material('#b1a37d'),windows=material('#625e4a'),paving=material('#aaa68b');
  const style=region.politicalOwner;
  const roof=material(style==='atlas'?'#526e7a':style==='meridian'?'#986d55':'#688477');
  piece(group,cylinder,paving,0,.035,0,1.9,.07,1.9);
  // Small blocks form streets around a readable central landmark.
  for(let i=0;i<16;i++){
    const a=i*Math.PI*2/16,r=1.05+(i%3)*.22,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=.32+random()*.5,w=.3+random()*.15;
    piece(group,box,walls,x,h/2+.07,z,w,h,w*.9,a);
    piece(group,cone,roof,x,h+.21,z,w*.85,.28,w*.8,a+Math.PI/4);
    piece(group,box,windows,x-.04,h*.6,z+w*.46,.08,.12,.015);
    if(i%4===0)piece(group,box,trim,x,h+.1,z,w*.9,.12,w*.9,a);
  }
  if(style==='neutral'){
    const stone=material('#939c98'),roof=material('#545f62');
    piece(group,cylinder,stone,0,.5,0,.65,1,.65);piece(group,cone,roof,0,1.25,0,.78,.55,.78,Math.PI/4);
    for(const x of [-.8,.8]){piece(group,box,stone,x,.25,.2,.4,.5,.45);piece(group,cone,roof,x,.65,.2,.38,.3,.38);}
  }else if(style==='atlas'){
    piece(group,box,walls,0,.4,0,1.05,.8,.75);
    piece(group,box,trim,0,.85,0,1.25,.12,.9);
    piece(group,dome,roof,0,.96,0,.53,.56,.53);
    for(const x of [-.44,-.15,.15,.44])piece(group,cylinder,walls,x,.42,.5,.055,.75,.055);
    piece(group,box,trim,0,.06,.6,1.4,.12,.65);
    piece(group,cylinder,trim,0,1.6,0,.04,.25,.04);
  }else if(style==='meridian'){
    piece(group,box,walls,0,.55,0,.85,1.1,.85);
    piece(group,box,roof,0,1.14,0,.98,.12,.98);
    for(const x of [-.56,.56])for(const z of [-.56,.56]){
      piece(group,cylinder,walls,x,.55,z,.23,1.1,.23);
      piece(group,cone,roof,x,1.24,z,.32,.32,.32,Math.PI/4);
    }
    for(let i=0;i<10;i++){const a=i*Math.PI*2/10;piece(group,box,trim,Math.cos(a)*1.95,.16,Math.sin(a)*1.95,.34,.32,.15,-a);}
  }else{
    for(let i=0;i<3;i++){
      const width=.85-i*.16;
      piece(group,box,walls,0,.3+i*.45,0,width,.5,width);
      piece(group,cone,roof,0,.6+i*.45,0,width*.95,.25,width*.95,Math.PI/4);
    }
    piece(group,cylinder,trim,0,1.8,0,.04,.35,.04);
    for(const x of [-.75,.75])piece(group,box,walls,x,.2,.65,.28,.4,.28);
    piece(group,box,roof,0,.48,.65,1.95,.12,.4);
  }
  return group;
}
// Merge static urban parts by material: hundreds of buildings become a few draw calls.
export function batchStatic(groups:THREE.Group[]):THREE.Group {
  const result=new THREE.Group(),buckets=new Map<string,{material:THREE.Material;geometries:THREE.BufferGeometry[]}>();
  groups.forEach(group=>{
    group.updateMatrixWorld(true);
    group.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return;
      const mat=object.material as THREE.MeshStandardMaterial;
      const key=`${mat.color.getHexString()}-${mat.roughness}`;
      let bucket=buckets.get(key);
      if(!bucket){bucket={material:mat,geometries:[]};buckets.set(key,bucket);}else if(bucket.material!==mat)mat.dispose();
      bucket.geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
    });
  });
  buckets.forEach(({material,geometries})=>{
    const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);}
  });return result;
}
export function vegetation(roads:THREE.Vector3[][],economy:boolean):THREE.Group {
  const group=new THREE.Group(),random=randomGenerator(723);
  const treePositions:{x:number;z:number;y:number;size:number;angle:number}[]=[];
  const roadSamples=roads.flatMap(path=>path.filter((_,i)=>i%3===0));
  for(let i=0;i<6500&&treePositions.length<(economy?460:1050);i++){
    const x=(random()-.5)*64,z=(random()-.5)*36,d=coastDistance(x,z);
    if(climateAt(x,z)==='arid'||isNeutralLand(x,z)||d<.8||CITY_SITES.some(p=>Math.hypot(p.x-x,p.y-z)<2.5))continue;
    if(.5+Math.sin(x*.8)*Math.cos(z*.7)*.5<.35)continue;
    if(channel(x,z).distance<.8||roadSamples.some(p=>(p.x-x)**2+(p.z-z)**2<.15))continue;
    const y=heightAt(x,z);if(y>3.3||y<.35)continue;
    treePositions.push({x,z,y,size:.55+random()*.65,angle:random()*Math.PI*2});
  }
  const trunkGeo=new THREE.CylinderGeometry(.065,.1,.55,5);
  const crownParts=[0,1,2].map(i=>{const g=new THREE.ConeGeometry(.42-i*.09,.85,7);g.translate(0,.5+i*.3,0);return g;});
  const crownGeo=mergeGeometries(crownParts)!;crownParts.forEach(g=>g.dispose());
  const trunks=new THREE.InstancedMesh(trunkGeo,material('#6e6249'),treePositions.length);
  const crowns=new THREE.InstancedMesh(crownGeo,material('#ffffff'),treePositions.length);
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),size=new THREE.Vector3(),yAxis=new THREE.Vector3(0,1,0);
  treePositions.forEach((p,i)=>{
    rotation.setFromAxisAngle(yAxis,p.angle);size.setScalar(p.size);
    matrix.compose(new THREE.Vector3(p.x,p.y+.12,p.z),rotation,size);trunks.setMatrixAt(i,matrix);crowns.setMatrixAt(i,matrix);
    crowns.setColorAt(i,climateAt(p.x,p.z)==='polar'?new THREE.Color('#c0d4d1'):new THREE.Color().setHSL(.28+random()*.06,.2+random()*.13,.22+random()*.12));
  });crowns.castShadow=true;crowns.receiveShadow=true;group.add(trunks,crowns);
  const stones:THREE.Matrix4[]=[];
  for(let i=0;i<250;i++){
    const x=(random()-.5)*65,z=(random()-.5)*35,d=coastDistance(x,z);
    if(d<-.6||d>1.5||CITY_SITES.some(p=>Math.hypot(p.x-x,p.y-z)<2.8))continue;
    const s=.18+random()*.45;rotation.setFromAxisAngle(yAxis,random()*6);matrix.compose(new THREE.Vector3(x,Math.max(heightAt(x,z),-.1),z),rotation,new THREE.Vector3(s,s*.65,s*.8));stones.push(matrix.clone());
  }
  const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material('#92978b'),stones.length);stones.forEach((m,i)=>rocks.setMatrixAt(i,m));rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
  // Cultivated strips sit on the continuous surface around settlements.
  const plots:THREE.BufferGeometry[]=[];
  CITY_SITES.forEach((site,index)=>{
    for(let row=0;row<5;row++){
      const x=site.x+2.3+row*.2,z=site.y+.2;
      if(coastDistance(x,z)<2||channel(x,z).distance<1)continue;
      const points=Array.from({length:7},(_,i)=>new THREE.Vector3(x,heightAt(x,z+i*.2)+.04,z+i*.2));
      const geo=ribbon(points,.15);const c=new THREE.Color(index%2?'#bca978':'#a4a46a');const values=new Float32Array(geo.attributes.position.count*3);
      for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}geo.setAttribute('color',new THREE.BufferAttribute(values,3));plots.push(geo);
    }
  });
  if(plots.length){const geo=mergeGeometries(plots)!;plots.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));mesh.receiveShadow=true;group.add(mesh);}
  return group;
}
