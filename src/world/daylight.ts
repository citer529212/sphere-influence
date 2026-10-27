import * as THREE from "three";
export type LightingMode = "cycle" | "day";
export const DAY_SECONDS = 240;
export function daylightAt(
  time: number,
  mode: LightingMode = "cycle",
  reduced = false,
) {
  const angle =
    (mode === "day" || reduced ? 0 : (time / DAY_SECONDS) * Math.PI * 2) +
    Math.PI / 2;
  const elevation = Math.sin(angle),
    day = THREE.MathUtils.smoothstep(elevation, -0.15, 0.45),
    sunset = (1 - Math.min(1, Math.abs(elevation) / 0.45)) * day;
  return {
    angle,
    day,
    sunset,
    ambient: 0.6 + day * 0.85,
    intensity: 0.45 + day * 2.65,
    water: 0.3 + day * 0.7,
    windows: 0.45 + (1 - day) * 2.2,
  };
}
export function createDaylight(
  scene: THREE.Scene,
  sun: THREE.DirectionalLight,
  sky: THREE.HemisphereLight,
  water: THREE.ShaderMaterial,
  reduced: boolean,
) {
  const night = new THREE.Color("#07121f"),
    dayColor = new THREE.Color("#142f40"),
    dusk = new THREE.Color("#795660"),
    moon = new THREE.Color("#93b7f2"),
    noon = new THREE.Color("#ffe4b6"),
    gold = new THREE.Color("#ffad72");
  const windows = new Set<THREE.MeshStandardMaterial>();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      for (const mat of Array.isArray(o.material) ? o.material : [o.material])
        if (
          mat instanceof THREE.MeshStandardMaterial &&
          mat.emissive.getHexString() === "ffbf66"
        )
          windows.add(mat);
    }
  });
  const background = scene.background as THREE.Color,
    fog = scene.fog as THREE.FogExp2;
  let shadowTime = -1,
    lastMode: LightingMode | undefined;
  const update = (time: number, mode: LightingMode = "cycle") => {
    const value = daylightAt(time, mode, reduced);
    background
      .copy(night)
      .lerp(dayColor, value.day)
      .lerp(dusk, value.sunset * 0.45);
    fog.color.copy(background);
    sky.intensity = value.ambient;
    sun.intensity = value.intensity;
    sun.color.copy(moon).lerp(noon, value.day).lerp(gold, value.sunset);
    // Throttle shadow movement, keeping light and its cached shadow aligned between updates.
    const moved =
      lastMode !== mode ||
      (!reduced && mode !== "day" && time - shadowTime > 0.5);
    if (moved) {
      sun.position.set(
        Math.cos(value.angle) * 36,
        8 + Math.abs(Math.sin(value.angle)) * 34,
        -24,
      );
      shadowTime = time;
      lastMode = mode;
    }
    water.uniforms.daylight.value = value.water;
    for (const mat of windows) mat.emissiveIntensity = value.windows;
    return moved;
  };
  update(0);
  return { update };
}
