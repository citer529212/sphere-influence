import { FactionId } from "../game/types";
export type MusicKey = "menu" | FactionId | `victory-${FactionId}` | "loss";
export const MUSIC: Record<
  MusicKey,
  { src: string; title: string; isrc: string; loopStart: number; edit: string }
> = {
  menu: {
    src: "./music/menu.mp3",
    title: "Dragon and Toast",
    isrc: "USUAN1100251",
    loopStart: 0,
    edit: "Фрагмент 0:00.5–3:00.5.",
  },
  atlas: {
    src: "./music/atlas.mp3",
    title: "Court of the Queen",
    isrc: "USUAN1100728",
    loopStart: 0,
    edit: "Фрагмент 0:01–3:19.",
  },
  meridian: {
    src: "./music/meridian.mp3",
    title: "Ishikari Lore",
    isrc: "USUAN1100192",
    loopStart: 0,
    edit: "Фрагмент 0:01–2:39.",
  },
  concordat: {
    src: "./music/concordat.mp3",
    title: "Digya",
    isrc: "USUAN1200080",
    loopStart: 0,
    edit: "Фрагмент 0:00.2–2:42.2.",
  },
  "victory-atlas": {
    src: "./music/victory-atlas.mp3",
    title: "Procession of the King",
    isrc: "USUAN1100745",
    loopStart: 8,
    edit: "Начало 0:10–0:18; продолжение 0:48–2:18.",
  },
  "victory-meridian": {
    src: "./music/victory-meridian.mp3",
    title: "Finding Movement",
    isrc: "USUAN1100693",
    loopStart: 8,
    edit: "Начало 0:32–0:40; продолжение 1:18–1:54.",
  },
  "victory-concordat": {
    src: "./music/victory-concordat.mp3",
    title: "Allada",
    isrc: "USUAN1500001",
    loopStart: 8,
    edit: "Начало 0:00–0:08; продолжение 0:48–2:18. Исходный файл: Allada — Full Mix.",
  },
  loss: {
    src: "./music/loss.mp3",
    title: "Sad Trio",
    isrc: "USUAN1100089",
    loopStart: 0,
    edit: "Фрагмент 0:05–2:05.",
  },
};
export const MUSIC_LICENSE =
  "Licensed under Creative Commons: By Attribution 4.0 License.";
export const MUSIC_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
export const MUSIC_EDITS =
  "Выбраны указанные фрагменты исходных записей. Обработка loudnorm с целью −20 LUFS, потолком −2 dBTP и LRA 11; перекодирование в MP3 128 кбит/с, стерео 44,1 кГц, удалены обложки и исходные теги. Стык каждого повторяемого фрагмента обработан двухсекундным линейным перекрёстным затуханием со сдвигом начала цикла на 2 секунды. В финалах последние 2 секунды вступительного фрагмента сведены с предшествующим стыку участком цикла; продолжение дополнительно приглушено на 4 дБ. Первые 8 секунд финала воспроизводятся один раз, затем повторяется только продолжение. Переходы между темами и регулировка громкости выполняются в игре.";
