import type { PoliticalOwnerId } from '../game/types';

export type Point = readonly [number, number];
export type Land = { faction: PoliticalOwnerId; points: readonly Point[] };

const crowns = ['atlas', 'meridian', 'concordat'] as const;
const standardCoasts: readonly Point[][] = [
  [[-34,-12],[-28,-17],[-21,-15],[-16,-8],[-20,-4],[-15,1],[-20,10],[-27,13],[-32,6],[-30,1],[-35,-4]],
  [[-10,-9],[-6,-15],[2,-17],[9,-12],[10,-5],[5,-2],[11,3],[7,10],[-1,12],[-8,7],[-10,1],[-5,-3]],
  [[15,-4],[19,-11],[26,-14],[32,-10],[35,-4],[31,0],[35,6],[31,12],[24,16],[19,12],[22,6],[16,3]],
];
const expertCoasts: readonly Point[][] = [
  [[-36,-17],[-30,-21],[-19,-21],[-13,-15],[-17,-9],[-14,-4],[-20,0],[-18,5],[-24,11],[-32,8],[-35,2],[-30,-3],[-35,-7]],
  [[-11,-15],[-4,-20],[4,-19],[11,-14],[9,-8],[12,-2],[8,4],[11,9],[5,15],[-4,16],[-10,9],[-7,4],[-12,-1],[-8,-6]],
  [[14,-15],[22,-20],[31,-17],[36,-11],[34,-4],[30,-2],[36,4],[35,11],[30,17],[24,15],[19,20],[14,14],[16,6],[21,2],[16,-3]],
];
const standardSites: readonly Point[] = [
  [-29,-11],[-23,-9],[-25,0],[-25,7],[-4,-10],[4,-11],[-3,1],[4,6],
  [23,-7],[30,-5],[26,4],[27,10],[-13,8],[13,5],[-13,-13],[12,-17],
];
const expertSites: readonly Point[] = [
  [-30,-15],[-22,-15],[-24,-6],[-30,3],[-4,-14],[5,-12],[-4,-3],[4,3],
  [20,-13],[29,-12],[27,-4],[29,9],[-13,12],[12,16],[-13,-21],[12,-21],
  [-20,-8],[-25,5],[4,-5],[-3,10],[31,3],[21,12],
  [-34,16],[-25,17],[-18,19],[-10,20],[-1,21],[7,21],
];

function outline(center: Point, xRadius: number, zRadius: number, seed: number): Point[] {
  return Array.from({length: 24}, (_, index) => {
    const angle = index / 24 * Math.PI * 2;
    const edge = 1 + .12 * Math.sin(5 * angle + seed) + .07 * Math.cos(9 * angle - seed);
    return [center[0] + Math.cos(angle) * xRadius * edge, center[1] + Math.sin(angle) * zRadius * edge];
  });
}

function makeLayout(coasts: readonly Point[][], sites: readonly Point[]) {
  const lands: Land[] = coasts.map((points, index) => ({points, faction: crowns[index]}));
  const territories = sites.map((point, index) => {
    const neutral = (index >= 12 && index < 16) || index >= 22;
    const points = outline(point, neutral ? 1.65 : 2.3, neutral ? 1.4 : 1.9, index);
    if (neutral) lands.push({faction: 'neutral', points});
    return points;
  });
  return { lands, sites, territories };
}

export const STANDARD_LAYOUT = makeLayout(standardCoasts, standardSites);
export const EXPERT_LAYOUT = makeLayout(expertCoasts, expertSites);
export const EASY_SCALE = .72;
