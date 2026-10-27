import * as THREE from "three";
import { CITY_SITES, coastDistance, heightAt } from "./terrain";

// Routes use a conservative ocean grid; sample every edge so hulls cannot cut across islands.
export function seaRoutes(): THREE.Vector3[][] {
  const width = 39,
    depth = 25,
    points: THREE.Vector3[] = [],
    water: boolean[] = [];
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++) {
      const p = new THREE.Vector3(-38 + x * 2, 0.12, -24 + z * 2);
      points.push(p);
      water.push(coastDistance(p.x, p.z) < -1);
    }
  const neighbors = (i: number) =>
    [
      i % width > 0 ? i - 1 : -1,
      i % width < width - 1 ? i + 1 : -1,
      i >= width ? i - width : -1,
      i < width * (depth - 1) ? i + width : -1,
    ].filter(
      (j) =>
        j >= 0 &&
        water[j] &&
        Array.from({ length: 9 }, (_, k) => {
          const t = k / 8;
          return (
            coastDistance(
              points[i].x + (points[j].x - points[i].x) * t,
              points[i].z + (points[j].z - points[i].z) * t,
            ) < -0.7
          );
        }).every(Boolean),
    );
  const edges = points.map((_, i) => (water[i] ? neighbors(i) : []));
  const ocean = new Set<number>([0]),
    queue = [0];
  for (let n = 0; n < queue.length; n++)
    for (const j of edges[queue[n]])
      if (!ocean.has(j)) {
        ocean.add(j);
        queue.push(j);
      }
  const ports = [0, 4, 8].map((city) => {
    const target = new THREE.Vector3(
      CITY_SITES[city].x,
      0.12,
      CITY_SITES[city].y,
    );
    return [...ocean].reduce(
      (best, i) =>
        points[i].distanceToSquared(target) <
        points[best].distanceToSquared(target)
          ? i
          : best,
      0,
    );
  });
  return ports
    .map((start, k) => {
      const end = ports[(k + 1) % ports.length],
        previous = new Map<number, number>([[start, -1]]),
        todo = [start];
      for (let n = 0; n < todo.length && !previous.has(end); n++)
        for (const j of edges[todo[n]])
          if (!previous.has(j)) {
            previous.set(j, todo[n]);
            todo.push(j);
          }
      if (!previous.has(end) || start === end) return [];
      const path: THREE.Vector3[] = [];
      for (let i = end; i !== -1; i = previous.get(i)!)
        path.push(points[i].clone());
      return path.reverse();
    })
    .filter((path) => path.length > 1);
}

export function createLivingMap(economy: boolean, reduced: boolean) {
  const group = new THREE.Group(),
    matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    position = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    axis = new THREE.Vector3(0, 1, 0);
  const smokeCount = economy ? 16 : 32;
  const smoke = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({
      color: "#c5c4b8",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
    smokeCount,
  );
  smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  smoke.frustumCulled = false;
  group.add(smoke);
  const paths = seaRoutes(),
    routes = paths.map(() => new THREE.CurvePath<THREE.Vector3>());
  paths.forEach((path, i) => {
    for (let j = 1; j < path.length; j++)
      routes[i].add(new THREE.LineCurve3(path[j - 1], path[j]));
  });
  const hulls = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.22, 0.85, 4),
    new THREE.MeshStandardMaterial({ color: "#725342", roughness: 0.9 }),
    routes.length,
  );
  hulls.geometry.rotateX(Math.PI / 2);
  hulls.geometry.scale(1, 0.5, 1);
  const sails = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.025, 0.62, 0.42),
    new THREE.MeshStandardMaterial({ color: "#efe1b8", roughness: 1 }),
    routes.length,
  );
  hulls.frustumCulled = sails.frustumCulled = false;
  hulls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(hulls, sails);
  const tangent = new THREE.Vector3(),
    grounds = CITY_SITES.map((city) => heightAt(city.x, city.y)),
    lengths = routes.map((route) => route.getLength());
  const update = (time: number) => {
    const t = reduced ? 0 : time;
    for (let i = 0; i < smokeCount; i++) {
      const city = CITY_SITES[i % CITY_SITES.length],
        phase = (t * 0.17 + i * 0.371) % 1;
      position.set(
        city.x + 0.45 + phase * 0.65,
        grounds[i % CITY_SITES.length] + 0.85 + phase * 1.5,
        city.y - 0.25 + phase * 0.2,
      );
      matrix.compose(
        position,
        rotation.identity(),
        scale.setScalar((0.08 + phase * 0.2) * Math.sin(phase * Math.PI)),
      );
      smoke.setMatrixAt(i, matrix);
    }
    smoke.instanceMatrix.needsUpdate = true;
    routes.forEach((route, i) => {
      const cycle = ((t * 0.65) / lengths[i] + i * 0.31) % 2;
      const phase = cycle <= 1 ? cycle : 2 - cycle;
      route.getPoint(phase, position);
      route.getTangent(phase, tangent);
      if (cycle > 1) tangent.negate();
      rotation.setFromAxisAngle(axis, Math.atan2(tangent.x, tangent.z));
      position.y = 0.18 + (reduced ? 0 : Math.sin(t * 1.7 + i) * 0.025);
      matrix.compose(position, rotation, scale.setScalar(1));
      hulls.setMatrixAt(i, matrix);
      position.y += 0.4;
      matrix.compose(position, rotation, scale);
      sails.setMatrixAt(i, matrix);
    });
    hulls.instanceMatrix.needsUpdate = true;
    sails.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { group, update };
}

export function influencePulse(x: number, z: number) {
  const geometry = new THREE.RingGeometry(0, 7, 64, 20),
    vertices = geometry.attributes.position,
    radii = new Float32Array(vertices.count);
  for (let i = 0; i < vertices.count; i++) {
    const dx = vertices.getX(i),
      dz = vertices.getY(i);
    radii[i] = Math.hypot(dx, dz);
    vertices.setXYZ(i, dx, Math.max(0.04, heightAt(x + dx, z + dz) + 0.17), dz);
  }
  geometry.setAttribute("radius", new THREE.BufferAttribute(radii, 1));
  geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      progress: { value: 0 },
      tint: { value: new THREE.Color("#4baff5") },
    },
    vertexShader:
      "attribute float radius; varying float r; void main(){r=radius; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:
      "uniform float progress; uniform vec3 tint; varying float r; void main(){float edge=progress*6.5;float band=1.0-smoothstep(0.08,0.5,abs(r-edge));float alpha=band*(1.0-progress)*0.65;if(alpha<0.01)discard;gl_FragColor=vec4(tint,alpha);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}",
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0, z);
  mesh.visible = false;
  return mesh;
}
