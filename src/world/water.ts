import * as THREE from 'three';
import { coastDistance } from './terrain';
export function createWater(): THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial> {
  const size=192,data=new Uint8Array(size*size);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++)data[j*size+i]=Math.round(THREE.MathUtils.clamp((coastDistance((i/(size-1)-.5)*76,(j/(size-1)-.5)*48)+8)/16,0,1)*255);
  const shore=new THREE.DataTexture(data,size,size,THREE.RedFormat);shore.minFilter=shore.magFilter=THREE.LinearFilter;shore.needsUpdate=true;
  const material=new THREE.ShaderMaterial({
    uniforms:{shore:{value:shore},time:{value:0},deep:{value:new THREE.Color('#154757')},shallow:{value:new THREE.Color('#57978f')},foam:{value:new THREE.Color('#b9d5bc')}},
    vertexShader:`uniform float time; varying vec3 worldPosition;
      void main(){vec3 p=position; p.z+=sin(p.x*.65+time*.65)*cos(p.y*.54+time*.4)*.025;
      vec4 world=modelMatrix*vec4(p,1.);worldPosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform sampler2D shore;uniform float time;uniform vec3 deep;uniform vec3 shallow;uniform vec3 foam;varying vec3 worldPosition;
      void main(){vec2 p=worldPosition.xz;float a=atan(p.y,p.x);
      float edge=texture2D(shore,clamp(p/vec2(76.,48.)+.5,0.,1.)).r*16.-8.;float shelf=exp(-max(0.,-edge)*.43);
      float ripple=(sin(p.x*.8+p.y*1.2+time*.5)+sin(p.x*2.6-p.y*.7-time*.8))*.5;
      vec3 c=mix(deep,shallow,shelf*.8);c+=ripple*.0025;
      float band=sin(edge*8.+time*1.2+sin(a*23.)*.8)*.5+.5;
      float surf=pow(band,6.)*exp(-pow((edge+.18)*1.4,2.));c=mix(c,foam,surf*.3);
      float glint=pow(max(0.,sin(p.x*4.+time)*cos(p.y*5.-time*.8)),22.);c+=glint*.003;
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(500,500,90,90),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=.01;return mesh;
}
