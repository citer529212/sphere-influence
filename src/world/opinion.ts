import * as THREE from "three";
import { Region, FactionId } from "../game/types";
import { regionController, supportNeeded } from "../game/quickGame";
import { FACTION_IDS } from "../game/realms";
import { nearestCity } from "./terrain";
import { FACTION_COLORS } from "./scenery";

export function opinion(region: Region, player: FactionId) {
  const ranked = [...FACTION_IDS].sort(
    (a, b) => region.influence[b] - region.influence[a],
  );
  const margin = region.influence[ranked[0]] - region.influence[ranked[1]],
    controller = regionController(region);
  const status =
    controller === "contested"
      ? "Аудитория не определилась"
      : margin < 15
        ? "Хрупкое лидерство"
        : "Уверенное лидерство";
  return {
    controller,
    margin,
    status,
    support: region.influence[player],
    needed: supportNeeded(region, player),
    fragile: controller !== "contested" && margin < 15,
  };
}

// Recolor existing land vertices, preserving relief, climate and water. No extra overlay draw call.
export function createOpinionTint(geometry: THREE.BufferGeometry) {
  const attribute = geometry.getAttribute("color"),
    base = new Float32Array(attribute.array),
    positions = geometry.getAttribute("position");
  const cities = Int16Array.from({ length: positions.count }, (_, i) =>
    positions.getY(i) > 0.16
      ? nearestCity(positions.getX(i), positions.getZ(i))
      : -1,
  );
  const update = (regions: Region[], enabled: boolean) => {
    const tints = regions.map((region) => {
      const value = opinion(region, "atlas");
      return {
        color: new THREE.Color(FACTION_COLORS[value.controller]),
        strength:
          value.controller === "contested"
            ? 0.12
            : 0.12 + 0.18 * Math.min(1, Math.max(0, value.margin - 5) / 25),
      };
    });
    for (let i = 0; i < attribute.count; i++) {
      const tint = enabled ? tints[cities[i]] : undefined,
        a = tint?.strength ?? 0;
      attribute.setXYZ(
        i,
        base[i * 3] * (1 - a) + (tint?.color.r ?? 0) * a,
        base[i * 3 + 1] * (1 - a) + (tint?.color.g ?? 0) * a,
        base[i * 3 + 2] * (1 - a) + (tint?.color.b ?? 0) * a,
      );
    }
    attribute.needsUpdate = true;
  };
  return { update };
}
