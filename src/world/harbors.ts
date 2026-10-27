import * as THREE from "three";
import {
  CITY_SITES,
  coastDistance,
  heightAt,
  ribbon,
  channel,
} from "./terrain";

export function harborSite(index: number) {
  const city = CITY_SITES[index];
  if (!city) return null;
  let best: {
    shore: THREE.Vector2;
    sea: THREE.Vector2;
    distance: number;
  } | null = null;
  for (let angle = 0; angle < 32; angle++) {
    const dx = Math.cos((angle * Math.PI) / 16),
      dz = Math.sin((angle * Math.PI) / 16);
    let shore = city.clone();
    for (let distance = 0.25; distance <= 8; distance += 0.25) {
      const point = new THREE.Vector2(
          city.x + dx * distance,
          city.y + dz * distance,
        ),
        depth = coastDistance(point.x, point.y);
      if (depth > 0) shore = point;
      if (depth < -0.75 && heightAt(point.x, point.y) < -0.1) {
        const access = Array.from({ length: 25 }, (_, i) =>
          city.clone().lerp(shore, i / 24),
        ).every((p) => coastDistance(p.x, p.y) > 0);
        if (
          access &&
          (!best || distance < best.distance) &&
          coastDistance(shore.x, shore.y) > 0
        )
          best = { shore: shore.clone(), sea: point, distance };
        break;
      }
      if (best && distance >= best.distance) break;
    }
  }
  return best;
}

export function harborModel(index: number) {
  const site = harborSite(index);
  if (!site) return null;
  const group = new THREE.Group(),
    wood = new THREE.MeshStandardMaterial({
      color: "#8f7853",
      roughness: 0.88,
    }),
    stone = new THREE.MeshStandardMaterial({
      color: "#ded7bd",
      roughness: 0.88,
    }),
    roof = new THREE.MeshStandardMaterial({
      color: "#677677",
      roughness: 0.88,
    });
  const box = new THREE.BoxGeometry(1, 1, 1),
    direction = site.sea.clone().sub(site.shore).normalize(),
    angle = Math.atan2(direction.x, direction.y),
    length = site.shore.distanceTo(site.sea);
  const add = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    mat: THREE.Material,
    rotation = angle,
  ) => {
    const mesh = new THREE.Mesh(box, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  // Raised planks and pilings follow the coast without changing the source shoreline.
  const segments = Math.ceil(length / 0.25);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      x = THREE.MathUtils.lerp(site.shore.x, site.sea.x, t),
      z = THREE.MathUtils.lerp(site.shore.y, site.sea.y, t),
      deck = Math.max(0.24, heightAt(x, z) + 0.15);
    add(x, deck, z, 0.7, 0.1, length / segments + 0.05, wood);
    if (i % 3 === 0)
      for (const side of [-1, 1]) {
        const px = x + direction.y * 0.27 * side,
          pz = z - direction.x * 0.27 * side,
          bed = heightAt(px, pz),
          top = deck;
        add(
          px,
          (bed + top) / 2,
          pz,
          0.075,
          Math.max(0.15, top - bed),
          0.075,
          wood,
        );
      }
  }
  for (const side of [-1, 1]) {
    const x = site.sea.x + direction.y * 0.5 * side,
      z = site.sea.y - direction.x * 0.5 * side;
    add(x, 0.25, z, 0.4, 0.1, 0.6, wood);
  }
  const x = site.shore.x - direction.x * 0.5,
    z = site.shore.y - direction.y * 0.5,
    y = heightAt(x, z);
  add(x, y + 0.3, z, 0.7, 0.6, 0.65, stone);
  add(x, y + 0.65, z, 0.85, 0.12, 0.8, roof);
  for (let i = 0; i < 3; i++) {
    const px = site.shore.x + direction.y * (0.65 + i * 0.24),
      pz = site.shore.y - direction.x * (0.65 + i * 0.24);
    if (coastDistance(px, pz) > 0.15)
      add(px, heightAt(px, pz) + 0.13, pz, 0.2, 0.26, 0.2, wood);
  }
  const city = CITY_SITES[index],
    points = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24,
        px = THREE.MathUtils.lerp(city.x, site.shore.x, t),
        pz = THREE.MathUtils.lerp(city.y, site.shore.y, t);
      const water = channel(px, pz);
      return new THREE.Vector3(
        px,
        Math.max(
          heightAt(px, pz) + 0.06,
          water.distance < 0.6 ? water.bed + 0.24 : -Infinity,
        ),
        pz,
      );
    });
  const road = new THREE.Mesh(ribbon(points, 0.15), wood);
  road.receiveShadow = true;
  group.add(road);
  group.userData.harbor = site;
  return group;
}
