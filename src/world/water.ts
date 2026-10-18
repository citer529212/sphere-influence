import * as THREE from 'three';
export function createWater(): THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial> {
  const material=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},deep:{value:new THREE.Color('#154757')},shallow:{value:new THREE.Color('#57978f')},foam:{value:new THREE.Color('#b9d5bc')}},
    vertexShader:`uniform float time; varying vec3 worldPosition;
      void main(){vec3 p=position; p.z+=sin(p.x*.65+time*.65)*cos(p.y*.54+time*.4)*.025;
      vec4 world=modelMatrix*vec4(p,1.);worldPosition=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform float time;uniform vec3 deep;uniform vec3 shallow;uniform vec3 foam;varying vec3 worldPosition;
      void main(){vec2 p=worldPosition.xz;vec2 n=p/vec2(31.,17.);float a=atan(n.y,n.x);
      float r=1.+.055*sin(a*7.)+.035*cos(a*11.)+.025*sin(a*3.);
      float edge=(r-length(n))*17.;float shelf=exp(-max(0.,-edge)*.43);
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
