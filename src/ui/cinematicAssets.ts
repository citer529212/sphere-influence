import { FactionId } from "../game/types";
export const INTRO_MOVIES: Record<FactionId, string> = {
  atlas: "./cinematics/intro-atlas.mp4",
  meridian: "./cinematics/intro-meridian.mp4",
  concordat: "./cinematics/intro-concordat.mp4",
};
export const INTRO_POSTER = "./cinematics/intro-poster.jpg";
export function openingChapter(time: number): 0 | 1 | 2 {
  return time < 4.741667 ? 0 : time < 12.741667 ? 1 : 2;
}

export const VICTORY_MOVIES: Record<FactionId, string> = {
  atlas: "./cinematics/victory-atlas.mp4",
  meridian: "./cinematics/victory-meridian.mp4",
  concordat: "./cinematics/victory-concordat.mp4",
};
export const VICTORY_POSTERS: Record<FactionId, string> = {
  atlas: "./cinematics/victory-atlas.jpg",
  meridian: "./cinematics/victory-meridian.jpg",
  concordat: "./cinematics/victory-concordat.jpg",
};
