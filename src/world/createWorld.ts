import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FactionId } from '../game/types';
import { Region } from '../game/types';
import { CITY_SITES, TERRITORIES, RIVERS, channel, isNeutralLand, coastDistance, heightAt, nearestCity, ribbon, roadPaths, terrainGeometry } from './terrain';
import { batchStatic, cityModel, FACTION_COLORS, material, sharedAssetGeometries, vegetation } from './scenery';
import { MAP_LANDS } from './mapContours';
import { createWater } from './water';

export type WorldState={regions:Region[];selectedRegionId:string|null;layer:'political'|'information';player?:FactionId};
export type WorldApi={update:(state:WorldState)=>void;reset:()=>void;focus:()=>void;capture:()=>string;setInteraction:(enabled:boolean)=>void;setKeyboard:(enabled:boolean)=>void;zoom:(factor:number)=>void;dispose:()=>void};
type Callbacks={select:(id:string)=>void;hover:(id:string|null)=>void;announce:(text:string)=>void;error:()=>void};
type CityVisual={id:string;center:THREE.Vector2;ground:number;border:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;flag:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>;ring:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;wave:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;node:THREE.Group;label:HTMLButtonElement;controller:Region['infoController'];targetBorder:THREE.Color;targetFlag:THREE.Color;pulseStart:number;};

export function createWorld(container:HTMLDivElement,initial:WorldState,callbacks:Callbacks):WorldApi {
  const economy=window.matchMedia('(max-width: 600px)').matches;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:!economy,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,economy?1:1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D-карта трёх материков. WASD — перемещение камеры. Перетаскивайте для вращения, прокручивайте для приближения. Выбор городов доступен также в списке.');container.appendChild(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#21404c');scene.fog=new THREE.FogExp2('#21404c',.0035);
  const camera=new THREE.PerspectiveCamera(39,1,.1,600);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=!reduced;controls.dampingFactor=.085;controls.minDistance=10;controls.maxDistance=220;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.43;controls.screenSpacePanning=false;controls.maxTargetRadius=40;
  scene.add(new THREE.HemisphereLight('#dfebeb','#465842',1.7));
  const sun=new THREE.DirectionalLight('#fff0ce',2.8);sun.position.set(-22,42,-24);sun.castShadow=true;sun.shadow.mapSize.set(economy?1024:2048,economy?1024:2048);
  Object.assign(sun.shadow.camera,{left:-39,right:39,top:30,bottom:-30,near:1,far:100});sun.shadow.normalBias=.11;sun.shadow.bias=-.0003;sun.shadow.radius=3;scene.add(sun);
  const terrain=new THREE.Mesh(terrainGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.castShadow=true;terrain.receiveShadow=true;scene.add(terrain);
  const water=createWater();scene.add(water);
  for(const faction of ['atlas','meridian','concordat','neutral'] as const){
    const geos=MAP_LANDS.filter(p=>p.faction===faction).map(land=>{const points=land.points.map(([x,z])=>new THREE.Vector3(x,Math.max(.08,heightAt(x,z)+.12),z));points.push(points[0].clone());return ribbon(points,.055);});
    const geo=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(geo)scene.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:FACTION_COLORS[faction],transparent:true,opacity:.48,side:THREE.DoubleSide,depthWrite:false})));
  }
  const roads=roadPaths();
  const roadGeos=roads.map(path=>ribbon(path,.2));
  const roadMesh=new THREE.Mesh(mergeGeometries(roadGeos)!,material('#c0af87'));roadGeos.forEach(g=>g.dispose());roadMesh.receiveShadow=true;scene.add(roadMesh);
  const riverGeos=RIVERS.map(path=>ribbon(path.map(p=>new THREE.Vector3(p.x,p.bed+.07,p.z)),.52));
  const riverMesh=new THREE.Mesh(mergeGeometries(riverGeos)!,new THREE.MeshStandardMaterial({color:'#397e80',roughness:.75,metalness:0,side:THREE.DoubleSide}));riverGeos.forEach(g=>g.dispose());scene.add(riverMesh);
  // Bridges are raised above the carved channels and share the city batching pass.
  const staticGroups:THREE.Group[]=[];
  roads.forEach(path=>{
    let last=-10;
    path.forEach((p,i)=>{
      const water=channel(p.x,p.z);
      if(water.distance>.22||i-last<9)return;last=i;
      const group=new THREE.Group();group.position.set(p.x,water.bed+.25,p.z);
      const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];group.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
      const wood=material('#8f7853');
      const deck=new THREE.Mesh(new THREE.BoxGeometry(.45,.12,1.25),wood);group.add(deck);
      for(const x of [-.22,.22]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.045,.05,1.25),wood);rail.position.set(x,.25,0);group.add(rail);for(const z of [-.5,0,.5]){const post=new THREE.Mesh(new THREE.BoxGeometry(.06,.35,.06),wood);post.position.set(x,.1,z);group.add(post);}}
      staticGroups.push(group);
    });
  });
  scene.add(vegetation(roads,economy));
  const labelLayer=document.createElement('div');labelLayer.className='world-labels';container.appendChild(labelLayer);
  const visuals:CityVisual[]=[];
  initial.regions.slice(0,12).forEach((region,index)=>{
    const center=CITY_SITES[index],ground=heightAt(center.x,center.y);
    const model=cityModel(region,index);model.position.set(center.x,ground,center.y);staticGroups.push(model);
    const points:THREE.Vector3[]=[];const poly=TERRITORIES[index];
    poly.forEach((p,i)=>{
      const next=poly[(i+1)%poly.length],steps=Math.max(1,Math.ceil(p.distanceTo(next)/.35));
      for(let j=0;j<steps;j++){const v=p.clone().lerp(next,j/steps);v.lerp(center,.004);const y=heightAt(v.x,v.y);points.push(new THREE.Vector3(v.x,Math.max(y+.13,.035),v.y));}
    });points.push(points[0].clone());
    const borderMat=new THREE.MeshStandardMaterial({color:FACTION_COLORS[region.infoController],emissive:FACTION_COLORS[region.infoController],emissiveIntensity:.45,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false,roughness:1});
    const border=new THREE.Mesh(ribbon(points,.11),borderMat);scene.add(border);
    const ringGeometry=new THREE.RingGeometry(2.05,2.13,64);ringGeometry.rotateX(-Math.PI/2);const ringVertices=ringGeometry.attributes.position;for(let i=0;i<ringVertices.count;i++)ringVertices.setY(i,heightAt(center.x+ringVertices.getX(i),center.y+ringVertices.getZ(i))+.12);const ring=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#f6db9a',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));ring.position.set(center.x,0,center.y);scene.add(ring);
    const wave=new THREE.Mesh(new THREE.RingGeometry(1.9,2.06,64),new THREE.MeshBasicMaterial({color:FACTION_COLORS[region.infoController],transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));wave.rotation.x=-Math.PI/2;wave.position.set(center.x,ground+.1,center.y);wave.visible=false;scene.add(wave);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,2.9,6),material('#bca986'));pole.position.set(center.x+.25,ground+1.45,center.y+.25);scene.add(pole);
    const flagGeo=new THREE.PlaneGeometry(.85,.42,7,2);flagGeo.translate(.425,0,0);
    const flag=new THREE.Mesh(flagGeo,new THREE.MeshStandardMaterial({color:FACTION_COLORS[region.infoController],side:THREE.DoubleSide,roughness:.8}));flag.position.set(center.x+.25,ground+2.62,center.y+.25);scene.add(flag);
    const node=new THREE.Group();node.position.set(center.x-1.65,ground,center.y-.6);
    const mastMat=material('#b4bdb2'),tower=new THREE.Mesh(new THREE.CylinderGeometry(.045,.15,2.15,6),mastMat);tower.position.y=1.075;tower.castShadow=true;node.add(tower);
    const dish=new THREE.Mesh(new THREE.SphereGeometry(.28,10,6,0,Math.PI*2,0,Math.PI/2),mastMat);dish.position.set(.1,1.8,0);dish.rotation.z=.75;node.add(dish);scene.add(node);
    const label=document.createElement('button');label.className='world-city-label';label.textContent=region.name;label.setAttribute('aria-label',`Выбрать регион ${region.name}`);label.onclick=()=>callbacks.select(region.id);labelLayer.appendChild(label);
    visuals.push({id:region.id,center,ground,border,flag,ring,wave,node,label,controller:region.infoController,targetBorder:new THREE.Color(FACTION_COLORS[region.infoController]),targetFlag:new THREE.Color(FACTION_COLORS[region.infoController]),pulseStart:-10});
  });
  const urban=batchStatic(staticGroups);scene.add(urban);
  // Originals are CPU-only inputs for batching, so release their allocations as well.
  const sourceGeometries=new Set<THREE.BufferGeometry>(sharedAssetGeometries());staticGroups.forEach(g=>g.traverse(o=>{if(o instanceof THREE.Mesh)sourceGeometries.add(o.geometry);}));sourceGeometries.forEach(g=>g.dispose());
  renderer.shadowMap.needsUpdate=true;
  let state=initial,currentTime=0,announcementTimer:ReturnType<typeof setTimeout>|undefined;
  const update=(next:WorldState)=>{
    state=next;
    visuals.forEach(v=>{
      const region=next.regions.find(r=>r.id===v.id);if(!region)return;
      v.targetBorder.set(FACTION_COLORS[next.layer==='political'?region.politicalOwner:region.infoController]);v.targetFlag.set(FACTION_COLORS[region.infoController]);
      const selected=next.selectedRegionId===v.id;v.ring.visible=selected;v.border.material.opacity=selected?.94:.58;v.node.visible=Object.values(region.mediaNodes).some(n=>n>0);
      v.label.classList.toggle('selected',selected);v.label.style.borderLeftColor=FACTION_COLORS[region.infoController];v.label.setAttribute('aria-pressed',String(selected));v.label.title=`${region.name} · Поддержка ${region.influence[next.player??'atlas']}%`;
      if(v.controller!==region.infoController){
        v.controller=region.infoController;v.pulseStart=currentTime;v.wave.material.color.set(v.targetFlag);v.wave.visible=!reduced;
        v.label.classList.remove('city-captured');void v.label.offsetWidth;v.label.classList.add('city-captured');
        if(next.selectedRegionId===v.id){callbacks.announce(region.infoController===(next.player??'atlas')?`${region.name} — теперь на вашей стороне`:`${region.name}: баланс влияния изменился`);clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>callbacks.announce(''),3400);}
      }
      if(reduced){v.border.material.color.copy(v.targetBorder);v.border.material.emissive.copy(v.targetBorder);v.flag.material.color.copy(v.targetFlag);}
    });renderer.shadowMap.needsUpdate=true;
  };update(initial);
  let travel:{position:THREE.Vector3;target:THREE.Vector3}|null=null;
  let keyboardEnabled=true;const held=new Set<string>();
  const clearKeys=()=>held.clear();
  const keydown=(event:KeyboardEvent)=>{
    const tag=(event.target as HTMLElement)?.tagName;
    if(!keyboardEnabled||!controls.enabled||document.hidden||document.querySelector('[role="dialog"]')||['INPUT','TEXTAREA','SELECT'].includes(tag)||(event.target as HTMLElement)?.isContentEditable||event.metaKey||event.ctrlKey||event.altKey)return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();held.add(event.code);travel=null;}
  };
  const keyup=(event:KeyboardEvent)=>held.delete(event.code);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',clearKeys);
  const reset=()=>{
    const fit=Math.max(1,1.65/(container.clientWidth/container.clientHeight));
    travel=null;controls.target.set(0,.5,0);camera.position.set(3*fit,57*fit,47*fit);controls.update();
  };
  const focus=()=>{
    const visual=visuals.find(v=>v.id===state.selectedRegionId);if(!visual)return;
    const target=new THREE.Vector3(visual.center.x,visual.ground,visual.center.y);
    const direction=camera.position.clone().sub(controls.target).normalize().multiplyScalar(18);
    travel={position:target.clone().add(direction),target};
    if(reduced){camera.position.copy(travel.position);controls.target.copy(travel.target);travel=null;controls.update();}
  };
  const stopTravel=()=>{travel=null;};controls.addEventListener('start',stopTravel);
  let previousAspect=0;
  const resize=new ResizeObserver(()=>{
    const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
    if(Math.abs(previousAspect-camera.aspect)>.25)reset();previousAspect=camera.aspect;
  });resize.observe(container);reset();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const hitTest=(event:PointerEvent)=>{
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObject(terrain)[0];if(!hit||hit.point.y<.1||isNeutralLand(hit.point.x,hit.point.z)||coastDistance(hit.point.x,hit.point.z)<0)return null;
    return state.regions[nearestCity(hit.point.x,hit.point.z)]?.id??null;
  };
  const active=new Set<number>();let startX=0,startY=0,multiTouch=false,lastHover:string|null=null;
  const down=(event:PointerEvent)=>{active.add(event.pointerId);if(active.size>1)multiTouch=true;else{startX=event.clientX;startY=event.clientY;multiTouch=false;}};
  const up=(event:PointerEvent)=>{if(event.button===0&&active.size===1&&!multiTouch&&Math.hypot(event.clientX-startX,event.clientY-startY)<6){const hit=hitTest(event);if(hit)callbacks.select(hit);}active.delete(event.pointerId);};
  const cancel=(event:PointerEvent)=>{active.delete(event.pointerId);};
  let lastMove=0;
  const move=(event:PointerEvent)=>{if(active.size||performance.now()-lastMove<70)return;lastMove=performance.now();const hit=hitTest(event);canvas.style.cursor=hit?'pointer':'grab';if(hit!==lastHover){lastHover=hit;callbacks.hover(hit);}};
  const leave=()=>{lastHover=null;callbacks.hover(null);};
  const contextLost=(event:Event)=>{event.preventDefault();callbacks.error();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('webglcontextlost',contextLost);
  let visible=true;const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(container);
  let frame=0,last=performance.now(),rendered=0,totalFrameMs=0,profileFrames=0;
  const projected=new THREE.Vector3();
  const animate=(now:number)=>{
    frame=requestAnimationFrame(animate);const elapsed=now-last;last=now;
    if(document.hidden||!visible)return;
    const dt=Math.min(elapsed/1000,.05);currentTime+=dt;
    if(travel){const amount=1-Math.exp(-dt*6);camera.position.lerp(travel.position,amount);controls.target.lerp(travel.target,amount);if(camera.position.distanceTo(travel.position)<.03)travel=null;}
    if(held.size&&keyboardEnabled&&controls.enabled){
      const forward=controls.target.clone().sub(camera.position);forward.y=0;forward.normalize();
      const right=new THREE.Vector3(-forward.z,0,forward.x),delta=new THREE.Vector3();
      if(held.has('KeyW')||held.has('ArrowUp'))delta.add(forward);
      if(held.has('KeyS')||held.has('ArrowDown'))delta.sub(forward);
      if(held.has('KeyD')||held.has('ArrowRight'))delta.add(right);
      if(held.has('KeyA')||held.has('ArrowLeft'))delta.sub(right);
      delta.normalize().multiplyScalar(dt*Math.max(7,camera.position.distanceTo(controls.target)*.32));
      const target=controls.target.clone().add(delta);target.x=THREE.MathUtils.clamp(target.x,-36,36);target.z=THREE.MathUtils.clamp(target.z,-23,23);
      delta.copy(target).sub(controls.target);camera.position.add(delta);controls.target.copy(target);
    }
    controls.update();water.material.uniforms.time.value=reduced?0:currentTime;
    visuals.forEach(v=>{
      const amount=1-Math.exp(-dt*4);v.border.material.color.lerp(v.targetBorder,amount);v.border.material.emissive.copy(v.border.material.color);v.flag.material.color.lerp(v.targetFlag,amount);
      const age=currentTime-v.pulseStart;
      if(v.wave.visible){v.wave.scale.setScalar(1+age*1.7);v.wave.material.opacity=Math.max(0,(1-age/2)*.6);if(age>=2)v.wave.visible=false;}
      if(!reduced){const positions=v.flag.geometry.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i);positions.setZ(i,Math.sin(currentTime*2.4+x*6+v.center.x)*x*.16);}positions.needsUpdate=true;}
      if(rendered%2===0){projected.set(v.center.x,v.ground+.2,v.center.y+2).project(camera);v.label.style.transform=`translate(-50%,0)`;v.label.style.left=`${(projected.x*.5+.5)*container.clientWidth}px`;v.label.style.top=`${(-projected.y*.5+.5)*container.clientHeight}px`;v.label.hidden=(container.clientWidth<600&&v.id!==state.selectedRegionId)||projected.z>1||projected.z< -1||Math.abs(projected.x)>.98||Math.abs(projected.y)>.96;}
    });
    renderer.render(scene,camera);rendered++;
    if(elapsed<100&&rendered>20){totalFrameMs+=elapsed;profileFrames++;}
    if(import.meta.env.DEV&&rendered===140)console.info('[WorldScene] Rendering profile',JSON.stringify({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,averageFrameMs:Math.round(totalFrameMs/Math.max(1,profileFrames)*10)/10,quality:economy?'economy':'standard'}));
  };frame=requestAnimationFrame(animate);
  const capture=():string=>{
    const width=1200,height=500,target=new THREE.WebGLRenderTarget(width,height);
    target.texture.colorSpace=THREE.SRGBColorSpace;
    const previous=renderer.getRenderTarget();
    try{
      const snapshotCamera=new THREE.PerspectiveCamera(39,width/height,.1,600);snapshotCamera.position.set(2,53,45);snapshotCamera.lookAt(0,.5,0);
      renderer.setRenderTarget(target);renderer.render(scene,snapshotCamera);
      const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
      const output=document.createElement('canvas');output.width=width;output.height=height;const ctx=output.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
      const image=ctx.createImageData(width,height);for(let row=0;row<height;row++)image.data.set(pixels.subarray((height-row-1)*width*4,(height-row)*width*4),row*width*4);
      ctx.putImageData(image,0,0);return output.toDataURL('image/png');
    }finally{renderer.setRenderTarget(previous);target.dispose();}
  };
  const setInteraction=(enabled:boolean)=>{controls.enabled=enabled;canvas.style.touchAction=enabled?'none':'pan-y';active.clear();multiTouch=false;held.clear();};
  return {update,reset,focus,capture,setInteraction,setKeyboard:enabled=>{keyboardEnabled=enabled;held.clear();},zoom:factor=>{travel=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();},dispose:()=>{
    window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearKeys);document.removeEventListener('visibilitychange',clearKeys);
    cancelAnimationFrame(frame);clearTimeout(announcementTimer);resize.disconnect();observer.disconnect();controls.removeEventListener('start',stopTravel);controls.dispose();
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('webglcontextlost',contextLost);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));if(object instanceof THREE.InstancedMesh)object.dispose();}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sun.shadow.dispose();(water.material.uniforms.shore.value as THREE.Texture).dispose();renderer.dispose();canvas.remove();labelLayer.remove();
  }};
}
