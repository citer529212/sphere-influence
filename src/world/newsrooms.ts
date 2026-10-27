import * as THREE from "three";
import { Region } from "../game/types";
import { FACTION_IDS } from "../game/realms";
import { CITY_SITES, heightAt, coastDistance, channel } from "./terrain";
import { FACTION_COLORS } from "./scenery";
export function createNewsrooms(reduced: boolean) {
  const group = new THREE.Group(),
    count = CITY_SITES.length * 3;
  const buildings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.38, 0.5, 0.38),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.88 }),
    count,
  );
  const windows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.22, 0.12, 0.025),
    new THREE.MeshStandardMaterial({
      color: "#b9a16b",
      emissive: "#ffbf66",
      emissiveIntensity: 0.45,
      roughness: 0.85,
    }),
    count,
  );
  const positions = CITY_SITES.flatMap((city) =>
    FACTION_IDS.map((_, actor) => {
      for (let i = 0; i < 24; i++) {
        const a = ((actor * 8 + i) * Math.PI) / 12,
          x = city.x + Math.cos(a) * 2.25,
          z = city.y + Math.sin(a) * 2.25;
        if (coastDistance(x, z) > 0.3 && channel(x, z).distance > 0.5)
          return new THREE.Vector3(x, heightAt(x, z) + 0.25, z);
      }
      return new THREE.Vector3(
        city.x - 0.65 + actor * 0.55,
        heightAt(city.x, city.y) + 0.25,
        city.y - 0.6,
      );
    }),
  );
  buildings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  windows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  buildings.frustumCulled = windows.frustumCulled = false;
  buildings.castShadow = true;
  group.add(buildings, windows);
  const starts = Array<number>(count).fill(-10),
    active = Array<boolean>(count).fill(false),
    matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    scale = new THREE.Vector3(),
    position = new THREE.Vector3();
  positions.forEach((_, i) =>
    buildings.setColorAt(
      i,
      new THREE.Color(FACTION_COLORS[FACTION_IDS[i % 3]]),
    ),
  );
  const sync = (regions: Region[], time: number) => {
    for (let i = 0; i < count; i++) {
      const on = !!regions[Math.floor(i / 3)]?.mediaNodes[FACTION_IDS[i % 3]];
      if (on && !active[i]) starts[i] = time;
      active[i] = on;
    }
  };
  const update = (time: number) => {
    let growing = false;
    for (let i = 0; i < count; i++) {
      if (active[i] && !reduced && time - starts[i] < 1.1) growing = true;
      const size = !active[i]
        ? 0
        : reduced
          ? 1
          : Math.min(1, Math.max(0.01, (time - starts[i]) * 1.4));
      scale.set(1, size, 1);
      position.copy(positions[i]);
      position.y -= 0.25 * (1 - size);
      matrix.compose(
        position,
        rotation,
        active[i] ? scale : scale.setScalar(0),
      );
      buildings.setMatrixAt(i, matrix);
      position.y += 0.08 * size;
      position.z += 0.2;
      matrix.compose(position, rotation, scale);
      windows.setMatrixAt(i, matrix);
    }
    buildings.instanceMatrix.needsUpdate = true;
    windows.instanceMatrix.needsUpdate = true;
    return growing;
  };
  update(0);
  return { group, sync, update };
}
