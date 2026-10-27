import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FactionId } from '../game/types';
import { MEDIA_LINKS } from '../game/information';
import { ActionEvent } from '../game/quickGame';
import { Region } from '../game/types';
import { CITY_SITES, TERRITORIES, RIVERS, channel, coastDistance, heightAt, nearestCity, ribbon, roadPaths, terrainGeometry } from './terrain';
import { batchStatic, cityModel, FACTION_COLORS, material, sharedAssetGeometries, vegetation } from './scenery';
import { MAP_LANDS } from './mapContours';
import { createWater } from './water';
import { NavigationKeys } from './navigation';
import { createLivingMap, influencePulse } from './livingMap';

export type WorldState={regions:Region[];selectedRegionId:string|null;layer:'political'|'information';player?:FactionId;network?:boolean;reachableIds?:string[];actionEvent?:ActionEvent|null};
export type WorldApi={update:(state:WorldState)=>void;reset:()=>void;focus:(id?:string,wide?:boolean)=>void;capture:()=>string;setInteraction:(enabled:boolean)=>void;setKeyboard:(enabled:boolean)=>void;zoom:(factor:number)=>void;dispose:()=>void};
type Callbacks={select:(id:string)=>void;hover:(id:string|null)=>void;announce:(text:string)=>void;error:()=>void};
type CityVisual={id:string;center:THREE.Vector2;ground:number;border:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;flag:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>;ring:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;wave:THREE.Mesh<THREE.RingGeometry,THREE.ShaderMaterial>;node:THREE.Group;label:HTMLButtonElement;controller:Region['infoController'];targetBorder:THREE.Color;targetFlag:THREE.Color;pulseStart:number;badge:HTMLSpanElement;effectStart:number;buildStart:number;};

export function createWorld(container:HTMLDivElement,initial:WorldState,callbacks:Callbacks):WorldApi {
  const economy=window.matchMedia('(max-width: 600px)').matches;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:!economy,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,economy?1:1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D-карта трёх материков. WASD — перемещение камеры, Shift — ускорение. Перетаскивайте для вращения, прокручивайте для приближения. Выбор городов доступен также в списке.');container.appendChild(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#142f40');scene.fog=new THREE.FogExp2('#19394a',.0028);
  const camera=new THREE.PerspectiveCamera(39,1,.1,600);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=!reduced;controls.dampingFactor=.085;controls.minDistance=10;controls.maxDistance=220;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.43;controls.screenSpacePanning=false;controls.maxTargetRadius=40;
  scene.add(new THREE.HemisphereLight('#d9eaf2','#48533c',1.45));
  const sun=new THREE.DirectionalLight('#ffe4b6',3.1);sun.position.set(-22,42,-24);sun.castShadow=true;sun.shadow.mapSize.set(economy?1024:2048,economy?1024:2048);
  Object.assign(sun.shadow.camera,{left:-39,right:39,top:30,bottom:-30,near:1,far:100});sun.shadow.normalBias=.11;sun.shadow.bias=-.0003;sun.shadow.radius=3;scene.add(sun);
  const terrain=new THREE.Mesh(terrainGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.castShadow=true;terrain.receiveShadow=true;scene.add(terrain);
  const water=createWater();scene.add(water);
  for(const faction of ['atlas','meridian','concordat','neutral'] as const){
    const geos=MAP_LANDS.filter(p=>p.faction===faction).map(land=>{const points=land.points.map(([x,z])=>new THREE.Vector3(x,Math.max(.08,heightAt(x,z)+.12),z));points.push(points[0].clone());return ribbon(points,.055);});
    const geo=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(geo)scene.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:FACTION_COLORS[faction],transparent:true,opacity:.48,side:THREE.DoubleSide,depthWrite:false})));
  }
  const broadcast=new THREE.Group();
  const connections=MEDIA_LINKS.map(([a,b])=>{
    const from=CITY_SITES[a],to=CITY_SITES[b],start=new THREE.Vector3(from.x,heightAt(from.x,from.y)+.6,from.y),end=new THREE.Vector3(to.x,heightAt(to.x,to.y)+.6,to.y),mid=start.clone().lerp(end,.5);mid.y=Math.max(start.y,end.y)+1.5+from.distanceTo(to)*.04;
    const curve=new THREE.CatmullRomCurve3([start,mid,end]),line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),new THREE.LineBasicMaterial({color:'#9cb2b2',transparent:true,opacity:.4,depthWrite:false}));broadcast.add(line);return {a,b,line,curve,active:false};
  });
  const signals=new THREE.InstancedMesh(new THREE.SphereGeometry(economy?.11:.14,economy?5:8,5),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.9,depthWrite:false}),connections.length);signals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);signals.frustumCulled=false;broadcast.add(signals);scene.add(broadcast);
  const signalMatrix=new THREE.Matrix4(),signalPosition=new THREE.Vector3(),signalScale=new THREE.Vector3(),signalRotation=new THREE.Quaternion(),signalColor=new THREE.Color();
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
  initial.regions.slice(0,CITY_SITES.length).forEach((region,index)=>{
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
    const wave=influencePulse(center.x,center.y);scene.add(wave);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,2.9,6),material('#bca986'));pole.position.set(center.x+.9,ground+1.45,center.y+.4);scene.add(pole);
    const flagGeo=new THREE.PlaneGeometry(.85,.42,7,2);flagGeo.translate(.425,0,0);
    const flag=new THREE.Mesh(flagGeo,new THREE.MeshStandardMaterial({color:FACTION_COLORS[region.infoController],side:THREE.DoubleSide,roughness:.8}));flag.position.set(center.x+.9,ground+2.62,center.y+.4);scene.add(flag);
    const node=new THREE.Group();node.position.set(center.x-1.65,ground,center.y-.6);
    const mastMat=material('#b4bdb2'),tower=new THREE.Mesh(new THREE.CylinderGeometry(.045,.15,2.15,6),mastMat);tower.position.y=1.075;tower.castShadow=true;node.add(tower);
    const dish=new THREE.Mesh(new THREE.SphereGeometry(.28,10,6,0,Math.PI*2,0,Math.PI/2),mastMat);dish.position.set(.1,1.8,0);dish.rotation.z=.75;node.add(dish);const beacon=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:'#ffe2a0'}));beacon.position.y=2.2;node.add(beacon);scene.add(node);
    const label=document.createElement('button');label.className='world-city-label';label.textContent=region.name;const badge=document.createElement('span');badge.className='city-action-badge';badge.hidden=true;label.appendChild(badge);label.setAttribute('aria-label',`Выбрать регион ${region.name}`);label.onclick=()=>callbacks.select(region.id);labelLayer.appendChild(label);
    visuals.push({id:region.id,center,ground,border,flag,ring,wave,node,label,controller:region.infoController,targetBorder:new THREE.Color(FACTION_COLORS[region.infoController]),targetFlag:new THREE.Color(FACTION_COLORS[region.infoController]),pulseStart:-10,badge,effectStart:-10,buildStart:-10});
  });
  const urban=batchStatic(staticGroups);scene.add(urban);
  const living=createLivingMap(economy,reduced);scene.add(living.group);
  // Originals are CPU-only inputs for batching, so release their allocations as well.
  const sourceGeometries=new Set<THREE.BufferGeometry>(sharedAssetGeometries());staticGroups.forEach(g=>g.traverse(o=>{if(o instanceof THREE.Mesh)sourceGeometries.add(o.geometry);}));sourceGeometries.forEach(g=>g.dispose());
  renderer.shadowMap.needsUpdate=true;
  let handledEvent=0;
  let messenger:{curve:THREE.CatmullRomCurve3;line:THREE.Line<THREE.BufferGeometry,THREE.LineBasicMaterial>;orb:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;start:number}|null=null;
  const clearMessenger=()=>{if(!messenger)return;scene.remove(messenger.line,messenger.orb);messenger.line.geometry.dispose();messenger.line.material.dispose();messenger.orb.geometry.dispose();messenger.orb.material.dispose();messenger=null;};
  let state=initial,currentTime=0,announcementTimer:ReturnType<typeof setTimeout>|undefined;
  const update=(next:WorldState)=>{
    state=next;broadcast.visible=!!next.network;
    for(const connection of connections){const {a,b,line}=connection;const active=next.reachableIds?.includes(next.regions[a]?.id)&&next.reachableIds?.includes(next.regions[b]?.id);connection.active=!!active;line.material.color.set(active?FACTION_COLORS[next.player??'atlas']:'#8a9f9f');line.material.opacity=active?.72:.14;}

    signalColor.set(FACTION_COLORS[next.player??'atlas']);connections.forEach((_,i)=>signals.setColorAt(i,signalColor));if(signals.instanceColor)signals.instanceColor.needsUpdate=true;
    visuals.forEach(v=>{
      const region=next.regions.find(r=>r.id===v.id);if(!region)return;
      v.targetBorder.set(FACTION_COLORS[next.layer==='political'?region.politicalOwner:region.infoController]);v.targetFlag.set(FACTION_COLORS[region.infoController]);
      const selected=next.selectedRegionId===v.id;v.ring.visible=selected;v.border.material.opacity=selected?.94:.58;v.node.visible=Object.values(region.mediaNodes).some(n=>n>0);
      v.label.classList.toggle('selected',selected);v.label.classList.toggle('outside-reach',!!next.reachableIds&&!next.reachableIds.includes(v.id));v.label.style.borderLeftColor=FACTION_COLORS[region.infoController];v.label.setAttribute('aria-pressed',String(selected));v.label.title=`${region.name} · Поддержка ${region.influence[next.player??'atlas']}%`;
      if(v.controller!==region.infoController){
        v.controller=region.infoController;v.pulseStart=currentTime;v.wave.material.uniforms.tint.value.copy(v.targetFlag);v.wave.visible=!reduced;
        v.label.classList.remove('city-captured');void v.label.offsetWidth;v.label.classList.add('city-captured');
        if(next.selectedRegionId===v.id){callbacks.announce(region.infoController===(next.player??'atlas')?`${region.name} — ваша повестка лидирует`:`${region.name}: баланс информационного влияния изменился`);clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>callbacks.announce(''),3400);}
      }
      if(reduced){v.border.material.color.copy(v.targetBorder);v.border.material.emissive.copy(v.targetBorder);v.flag.material.color.copy(v.targetFlag);}
    });
    const event=next.actionEvent,newEvent=!!event&&event.id!==handledEvent;
    if(event&&newEvent){
      handledEvent=event.id;clearMessenger();
      const v=visuals.find(v=>v.id===event.regionId);
      if(v){
        v.effectStart=currentTime;v.pulseStart=currentTime;v.wave.material.uniforms.tint.value.set(event.kind==='protect'||event.kind==='blocked'?'#9de3cf':FACTION_COLORS[event.actor]);v.wave.visible=!reduced;
        const icon=event.captured?'⚑':event.kind==='media'?'◈':event.kind==='protect'||event.kind==='blocked'?'◇':'⚑';
        v.badge.textContent=`${icon} ${event.captured?'Повестка лидирует':event.kind==='media'?'Центр +1':event.kind==='blocked'?'Защищён':`+${event.amount}`}`;
        v.badge.hidden=false;v.badge.style.setProperty('--action-color',FACTION_COLORS[event.actor]);v.badge.classList.remove('animate');void v.badge.offsetWidth;v.badge.classList.add('animate');
        if(event.kind==='media')v.buildStart=currentTime;
        if((event.kind==='opponent'||event.kind==='attract'||event.kind==='event')&&!reduced){
          const candidates=next.regions.map((r,i)=>({r,i})).filter(({r,i})=>i<CITY_SITES.length&&r.id!==v.id&&r.infoController===event.actor&&r.mediaNodes[event.actor]>0);
          candidates.sort((a,b)=>CITY_SITES[a.i].distanceToSquared(v.center)-CITY_SITES[b.i].distanceToSquared(v.center));
          const sourceIndex=candidates[0]?.i??next.regions.findIndex(r=>r.politicalOwner===event.actor),from=CITY_SITES[Math.max(0,sourceIndex)];
          v.pulseStart=currentTime+1.25;
          const sourceVisual=visuals[Math.max(0,sourceIndex)];if(sourceVisual&&sourceVisual!==v){sourceVisual.pulseStart=currentTime;sourceVisual.wave.material.uniforms.tint.value.set(FACTION_COLORS[event.actor]);sourceVisual.wave.visible=true;}
          const a=new THREE.Vector3(from.x,heightAt(from.x,from.y)+2,from.y),b=new THREE.Vector3(v.center.x,v.ground+2,v.center.y),mid=a.clone().lerp(b,.5);mid.y+=5;
          const curve=new THREE.CatmullRomCurve3([a,mid,b]);const geo=new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));geo.setDrawRange(0,1);
          const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:FACTION_COLORS[event.actor],transparent:true,opacity:.8}));
          const orb=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),new THREE.MeshBasicMaterial({color:FACTION_COLORS[event.actor]}));scene.add(line,orb);messenger={curve,line,orb,start:currentTime};
        }
        callbacks.announce(event.text);clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>callbacks.announce(''),3000);
      }
    }
    if(newEvent&&event?.kind==='income')for(const change of event.changes??[]){const v=visuals.find(v=>v.id===change.regionId);if(!v)continue;v.effectStart=currentTime;v.pulseStart=currentTime;v.wave.material.uniforms.tint.value.set(FACTION_COLORS[change.actor]);v.wave.visible=!reduced;v.badge.textContent=`◎ ${change.amount>0?'+':''}${change.amount}`;v.badge.hidden=false;v.badge.style.setProperty('--action-color',FACTION_COLORS[change.actor]);v.badge.classList.remove('animate');void v.badge.offsetWidth;v.badge.classList.add('animate');}
    renderer.shadowMap.needsUpdate=true;
  };update(initial);
  let travel:{position:THREE.Vector3;target:THREE.Vector3}|null=null;
  let keyboardEnabled=true;const navigation=new NavigationKeys(),held=navigation.held;
  const clearKeys=()=>navigation.clear();
  const keydown=(event:KeyboardEvent)=>{
    const tag=(event.target as HTMLElement)?.tagName;
    if(!keyboardEnabled||!controls.enabled||document.hidden||document.querySelector('[role="dialog"]')||['INPUT','TEXTAREA','SELECT'].includes(tag)||(event.target as HTMLElement)?.isContentEditable||event.metaKey||event.ctrlKey||event.altKey)return;
    if(navigation.press(event.code,event.shiftKey)){if(!event.code.startsWith('Shift')){event.preventDefault();travel=null;}}
  };
  const keyup=(event:KeyboardEvent)=>navigation.release(event.code);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',clearKeys);
  const reset=()=>{
    const fit=Math.max(1,1.65/(container.clientWidth/container.clientHeight));
    travel=null;controls.target.set(0,.5,0);camera.position.set(3*fit,57*fit,47*fit);controls.update();
  };
  const focus=(id=state.selectedRegionId,wide=false)=>{
    const visual=visuals.find(v=>v.id===id);if(!visual)return;
    const target=new THREE.Vector3(visual.center.x,visual.ground,visual.center.y);
    if(container.clientWidth<600){const towardCamera=camera.position.clone().sub(controls.target);towardCamera.y=0;target.add(towardCamera.normalize().multiplyScalar(5));}
    const direction=camera.position.clone().sub(controls.target).normalize().multiplyScalar(wide?32:22);
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
    const hit=raycaster.intersectObject(terrain)[0];if(!hit||hit.point.y<.1||coastDistance(hit.point.x,hit.point.z)<0)return null;
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
    if(navigation.moving&&keyboardEnabled&&controls.enabled){
      const forward=controls.target.clone().sub(camera.position);forward.y=0;forward.normalize();
      const right=new THREE.Vector3(-forward.z,0,forward.x),delta=new THREE.Vector3();
      if(held.has('KeyW')||held.has('ArrowUp'))delta.add(forward);
      if(held.has('KeyS')||held.has('ArrowDown'))delta.sub(forward);
      if(held.has('KeyD')||held.has('ArrowRight'))delta.add(right);
      if(held.has('KeyA')||held.has('ArrowLeft'))delta.sub(right);
      delta.normalize().multiplyScalar(dt*Math.max(7,camera.position.distanceTo(controls.target)*.32)*navigation.multiplier);
      const target=controls.target.clone().add(delta);target.x=THREE.MathUtils.clamp(target.x,-36,36);target.z=THREE.MathUtils.clamp(target.z,-23,23);
      delta.copy(target).sub(controls.target);camera.position.add(delta);controls.target.copy(target);
    }
    controls.update();water.material.uniforms.time.value=reduced?0:currentTime;living.update(currentTime);
    if(broadcast.visible){connections.forEach((connection,i)=>{connection.curve.getPoint(reduced?.5:(currentTime*.17+i*.137)%1,signalPosition);signalMatrix.compose(signalPosition,signalRotation,signalScale.setScalar(connection.active?1:0));signals.setMatrixAt(i,signalMatrix);});signals.instanceMatrix.needsUpdate=true;}
    visuals.forEach(v=>{
      const amount=1-Math.exp(-dt*4);v.border.material.color.lerp(v.targetBorder,amount);v.border.material.emissive.copy(v.border.material.color);v.flag.material.color.lerp(v.targetFlag,amount);
      const age=currentTime-v.pulseStart;
      if(!v.badge.hidden&&currentTime-v.effectStart>2.8)v.badge.hidden=true;
      const buildAge=currentTime-v.buildStart;v.node.scale.setScalar(reduced||buildAge>1?1:Math.max(.05,Math.min(1,buildAge*1.4)));
      if(v.wave.visible){v.wave.material.uniforms.progress.value=Math.max(0,Math.min(1,age/2));if(age>=2)v.wave.visible=false;}
      if(!reduced){const positions=v.flag.geometry.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i);positions.setZ(i,Math.sin(currentTime*2.4+x*6+v.center.x)*x*.16);}positions.needsUpdate=true;}
      if(rendered%2===0){projected.set(v.center.x,v.ground+.2,v.center.y+2).project(camera);v.label.style.transform=`translate(-50%,0)`;v.label.style.left=`${(projected.x*.5+.5)*container.clientWidth}px`;v.label.style.top=`${(-projected.y*.5+.5)*container.clientHeight}px`;v.label.hidden=(container.clientWidth<600&&v.id!==state.selectedRegionId&&!(state.actionEvent?.regionId===v.id&&currentTime-v.effectStart<2.8))||projected.z>1||projected.z< -1||Math.abs(projected.x)>.98||Math.abs(projected.y)>.96;}
    });
    if(messenger){const t=Math.min(1,(currentTime-messenger.start)/1.25);messenger.orb.position.copy(messenger.curve.getPoint(t));messenger.line.geometry.setDrawRange(0,Math.max(2,Math.floor(t*64)));messenger.line.material.opacity=1-t*.6;if(t===1)clearMessenger();}
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
  const setInteraction=(enabled:boolean)=>{controls.enabled=enabled;canvas.style.touchAction=enabled?'none':'pan-y';active.clear();multiTouch=false;navigation.clear();};
  return {update,reset,focus,capture,setInteraction,setKeyboard:enabled=>{keyboardEnabled=enabled;navigation.clear();},zoom:factor=>{travel=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();},dispose:()=>{
    window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearKeys);document.removeEventListener('visibilitychange',clearKeys);
    clearMessenger();cancelAnimationFrame(frame);clearTimeout(announcementTimer);resize.disconnect();observer.disconnect();controls.removeEventListener('start',stopTravel);controls.dispose();
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('webglcontextlost',contextLost);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));if(object instanceof THREE.InstancedMesh)object.dispose();}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sun.shadow.dispose();(water.material.uniforms.shore.value as THREE.Texture).dispose();renderer.dispose();canvas.remove();labelLayer.remove();
  }};
}
