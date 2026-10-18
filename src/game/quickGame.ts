import { createInitialState } from './data';
import { FactionId, Region } from './types';

export type QuickAction = 'media' | 'attract' | 'protect';
export type QuickState = { seed: string; turn: number; actions: number; influence: number; trust: number; regions: Region[]; log: string[]; result: 'win' | 'loss' | null };
export const RULESET_VERSION = '1';
export const QUICK_GOAL = 8;
export const QUICK_LIMIT = 15;
export const QUICK_ACTIONS = {
  media: { name: 'Медиацентр', cost: 5, description: 'Город приносит +1 влияния каждый ход. Один центр на город.', effect: 'Долгосрочный доход' },
  attract: { name: 'Привлечь город', cost: 3, description: 'Рост поддержки зависит от доверия и усталости. Повторные кампании утомляют город.', effect: 'Ближе к переходу на вашу сторону' },
  protect: { name: 'Укрепить доверие', cost: 2, description: '+6 доверия, +10 поддержки в городе и защита от следующего ответа соперника.', effect: 'Доверие усиливает будущие кампании' }
} as const;
export function dailySeed(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function hash(text: string): number { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
export function createQuickGame(seed: string): QuickState {
  const all = createInitialState().regions;
  const ids = ['mist-isles','northern-reef','polar-coast','north-isthmus','northern-hills','heart-meridian','volcanic-plateau','crimson-canyon','iris-delta','emerald-delta','technopolis','central-delta'];
  const factions: FactionId[] = ['atlas', 'meridian', 'concordat'];
  const regions = ids.map((id, i) => {
    const source = all.find(r => r.id === id)!;
    const owner = factions[Math.floor(i / 4)];
    const region: Region = structuredClone(source);
    region.politicalOwner = owner; region.infoController = owner;
    region.influence = { atlas: 18, meridian: 18, concordat: 18 };
    region.influence[owner] = 62 + hash(seed + id) % 10;
    region.mediaNodes = { atlas: 0, meridian: 0, concordat: 0 };
    region.factCheckShield = { atlas: 0, meridian: 0, concordat: 0 };
    region.fatigue = 0;
    return region;
  });
  return { seed, turn: 1, actions: 2, influence: 12, trust: 60, regions, log: ['Получите поддержку 8 из 12 городов за 15 ходов.'], result: null };
}
export function controlled(state: QuickState): number { return state.regions.filter(r => r.infoController === 'atlas').length; }
export function supportLead(region: Region): number { return Math.max(region.influence.meridian, region.influence.concordat); }
export function campaignGain(state: QuickState, region: Region): number { return Math.max(12, 22 + Math.floor(state.trust / 8) - Math.floor(region.fatigue / 6)); }
function recalculate(region: Region): void {
  const ranked = (['atlas','meridian','concordat'] as FactionId[]).sort((a,b) => region.influence[b] - region.influence[a]);
  region.infoController = region.influence[ranked[0]] - region.influence[ranked[1]] >= 5 ? ranked[0] : 'contested';
}
function finish(state: QuickState): void {
  if (controlled(state) >= QUICK_GOAL) { state.result = 'win'; state.log.unshift(`Победа! ${controlled(state)} городов поддерживают вас на ${state.turn}-м ходу.`); }
  else if (state.turn > QUICK_LIMIT) { state.result = 'loss'; state.turn = QUICK_LIMIT; state.log.unshift('Время вышло. Попробуйте другой маршрут к влиянию.'); }
  state.log = state.log.slice(0, 8);
}
export function actionError(state: QuickState, region: Region, action: QuickAction): string | null {
  if (state.result) return 'Партия завершена';
  if (state.actions < 1) return 'Завершите ход';
  if (state.influence < QUICK_ACTIONS[action].cost) return 'Не хватает влияния';
  if (action === 'media' && region.infoController !== 'atlas') return 'Нужен город на вашей стороне';
  if (action === 'media' && region.mediaNodes.atlas > 0) return 'Медиацентр уже построен';
  return null;
}
export function quickAction(current: QuickState, id: string, action: QuickAction): QuickState {
  const target = current.regions.find(r => r.id === id);
  if (!target || actionError(current, target, action)) return current;
  const state = structuredClone(current), region = state.regions.find(r => r.id === id)!;
  state.influence -= QUICK_ACTIONS[action].cost; state.actions--;
  if (action === 'media') { region.mediaNodes.atlas = 1; state.log.unshift(`«${region.name}»: открыт медиацентр. Доход +1 за ход.`); }
  if (action === 'attract') { const gain = campaignGain(state, region); region.influence.atlas = Math.min(100, region.influence.atlas + gain); region.fatigue = Math.min(100, region.fatigue + 10); state.trust = Math.max(0, state.trust - 3); state.log.unshift(`«${region.name}»: поддержка +${gain}. Доверие −3.`); }
  if (action === 'protect') { region.influence.atlas = Math.min(100, region.influence.atlas + 10); region.factCheckShield.atlas = 1; region.fatigue = Math.max(0, region.fatigue - 10); state.trust = Math.min(100, state.trust + 6); state.log.unshift(`«${region.name}»: поддержка +10, защита до следующего хода. Доверие +6.`); }
  const previous = region.infoController; recalculate(region);
  if (previous !== 'atlas' && region.infoController === 'atlas') { region.influence.meridian = Math.max(0, region.influence.meridian - 12); region.influence.concordat = Math.max(0, region.influence.concordat - 12); state.log.unshift(`Город «${region.name}» перешёл на вашу сторону! Поддержка соперников −12.`); }
  finish(state); return state;
}
export function quickEndTurn(current: QuickState): QuickState {
  if (current.result) return current;
  const state = structuredClone(current);
  for (const faction of ['meridian','concordat'] as const) {
    const candidates = state.regions.filter(r => r.infoController !== faction).sort((a,b) => {
      const score = (r: Region) => (r.politicalOwner === faction ? 25 : 0) + (r.infoController === 'atlas' ? 10 : 0) + r.influence[faction] - Math.max(...Object.values(r.influence)) + hash(state.seed + state.turn + r.id + faction) % 15;
      return score(b) - score(a);
    });
    const region = candidates[0]; if (!region) continue;
    const previous = region.infoController;
    if (region.factCheckShield.atlas > 0) state.log.unshift(`«${region.name}»: ваша защита сдержала соперника.`);
    else { region.influence[faction] = Math.min(100, region.influence[faction] + 6); recalculate(region); if (previous === 'atlas' && region.infoController !== 'atlas') state.log.unshift(`«${region.name}» теряет вашу повестку — укрепите поддержку.`); }
  }
  const income = 4 + state.regions.reduce((sum,r) => sum + r.mediaNodes.atlas * (r.infoController === 'atlas' ? 1 : 0), 0);
  state.influence += income;
  state.regions.forEach(r => { r.fatigue = Math.max(0, r.fatigue - 4); r.factCheckShield.atlas = 0; });
  state.turn++; state.actions = 2; state.log.unshift(`Новый ход: +${income} влияния. Соперники ответили.`);
  finish(state); return state;
}
