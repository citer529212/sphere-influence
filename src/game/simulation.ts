import { ACTIONS, FACTIONS, NARRATIVES, PLAYER_ACTIONS_PER_TURN, WORLD_EVENTS } from './data';
import { planAiActions } from './ai';
import {
  ActionId,
  ActionPreview,
  ControllerId,
  FactionId,
  GameResources,
  GameState,
  NarrativeId,
  Region,
  WorldEvent
} from './types';

const RESOURCE_KEYS: (keyof GameResources)[] = ['influence', 'attention', 'trust', 'mediaPower', 'culture'];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function deepCloneState(state: GameState): GameState {
  return structuredClone(state);
}

function addLog(state: GameState, message: string): void {
  state.log = [message, ...state.log].slice(0, 40);
}

function getLeadingOpponent(region: Region, faction: FactionId): FactionId {
  const candidates = (Object.keys(FACTIONS) as FactionId[])
    .filter((f) => f !== faction)
    .sort((a, b) => {
      const scoreA = region.influence[a] + region.mediaShare[a] + region.trust[a];
      const scoreB = region.influence[b] + region.mediaShare[b] + region.trust[b];
      return scoreB - scoreA;
    });
  return candidates[0] ?? (faction === 'atlas' ? 'meridian' : 'atlas');
}

function countMatches(issueTags: string[], narrativeId: NarrativeId): number {
  const narrativeTags = NARRATIVES[narrativeId].tags;
  return narrativeTags.filter((tag) => issueTags.includes(tag)).length;
}

function getNarrativeFit(region: Region, narrativeId: NarrativeId): number {
  const matchingTagsCount = countMatches(region.currentIssue, narrativeId);
  const conflictingTagsCount = Math.max(0, NARRATIVES[narrativeId].tags.length - matchingTagsCount);
  return 1 + matchingTagsCount * 0.15 - conflictingTagsCount * 0.1;
}

function getActionBoost(state: GameState, narrativeId: NarrativeId): number {
  return state.modifiers.narrativeBoost[narrativeId] ?? 0;
}

function getFactCheckPenalty(region: Region, actor: FactionId): number {
  const blockingPower = (Object.keys(region.factCheckShield) as FactionId[])
    .filter((f) => f !== actor)
    .reduce((maxValue, faction) => Math.max(maxValue, region.factCheckShield[faction]), 0);
  return Math.max(0.6, 1 - blockingPower * 0.1);
}

function getPromoteGain(
  state: GameState,
  region: Region,
  faction: FactionId,
  narrativeId: NarrativeId
): number {
  const baseActionPower = 6;
  const mediaBonus = Math.floor(region.mediaShare[faction] / 20);
  const nodeBonus = region.mediaNodes[faction] * 2;
  const eventBoost = getActionBoost(state, narrativeId);
  const channelPower = baseActionPower + mediaBonus + nodeBonus + eventBoost;

  const narrativeFit = getNarrativeFit(region, narrativeId);
  const trustFactor = 0.5 + region.trust[faction] / 200;
  const opennessFactor = 0.5 + region.openness / 200;
  const fatigueFactor = Math.max(0.25, 1 - region.fatigue / 150);
  const resistancePenalty = region.resistance / 12;
  const shieldPenalty = getFactCheckPenalty(region, faction);

  const influenceGain =
    channelPower * narrativeFit * trustFactor * opennessFactor * fatigueFactor * shieldPenalty -
    resistancePenalty;

  return clamp(Math.round(influenceGain), 0, 15);
}

function updateDominantNarrative(region: Region, narrativeId: NarrativeId, gain: number): void {
  const currentScore = countMatches(region.currentIssue, region.dominantNarrative) * 4;
  const challengerScore = countMatches(region.currentIssue, narrativeId) * 4 + gain;
  if (challengerScore >= currentScore + 2) {
    region.dominantNarrative = narrativeId;
  }
}

function payCost(resources: GameResources, cost: Partial<Record<keyof GameResources, number>>): void {
  for (const key of RESOURCE_KEYS) {
    const price = cost[key] ?? 0;
    resources[key] = Math.max(0, resources[key] - price);
  }
}

function canPay(resources: GameResources, cost: Partial<Record<keyof GameResources, number>>): boolean {
  return RESOURCE_KEYS.every((key) => resources[key] >= (cost[key] ?? 0));
}

function getController(region: Region): ControllerId {
  const ranked = (Object.keys(FACTIONS) as FactionId[])
    .map((faction) => {
      const infoWeight =
        region.influence[faction] * 0.4 +
        region.trust[faction] * 0.25 +
        region.mediaShare[faction] * 0.25 +
        region.eliteLoyalty[faction] * 0.1 -
        region.fatigue * 0.1;
      return { faction, infoWeight };
    })
    .sort((a, b) => b.infoWeight - a.infoWeight);

  const first = ranked[0];
  const second = ranked[1];

  if (!first || !second) {
    return 'contested';
  }

  if (first.infoWeight > 40 && first.infoWeight - second.infoWeight >= 8) {
    return first.faction;
  }

  return 'contested';
}

function normalizeRegion(region: Region): void {
  for (const faction of Object.keys(FACTIONS) as FactionId[]) {
    region.influence[faction] = clamp(region.influence[faction]);
    region.trust[faction] = clamp(region.trust[faction]);
    region.mediaShare[faction] = clamp(region.mediaShare[faction]);
    region.eliteLoyalty[faction] = clamp(region.eliteLoyalty[faction]);
    region.factCheckShield[faction] = clamp(region.factCheckShield[faction], 0, 5);
  }
  region.fatigue = clamp(region.fatigue);
  region.resistance = clamp(region.resistance);
  region.openness = clamp(region.openness);
  region.isCynicalZone = region.fatigue > 70;
}

function applyAction(
  state: GameState,
  faction: FactionId,
  regionId: string,
  actionId: ActionId,
  narrativeId?: NarrativeId,
  spendResources = false
): boolean {
  if (state.victory.winner || state.victory.loser) {
    return false;
  }

  const region = state.regions.find((item) => item.id === regionId);
  if (!region) {
    return false;
  }

  const action = ACTIONS[actionId];
  if (!action) {
    return false;
  }

  if (spendResources && !canPay(state.resources, action.cost as Partial<Record<keyof GameResources, number>>)) {
    return false;
  }

  if (spendResources) {
    payCost(state.resources, action.cost as Partial<Record<keyof GameResources, number>>);
    state.actionsLeft = Math.max(0, state.actionsLeft - 1);
  }

  region.hadCampaignThisTurn = true;
  const actionNarrative = narrativeId ?? FACTIONS[faction].preferredNarratives[0];

  switch (actionId) {
    case 'promote': {
      const gain = getPromoteGain(state, region, faction, actionNarrative);
      region.influence[faction] += gain;
      region.mediaShare[faction] += Math.round(gain * 0.6);
      region.fatigue += 3;
      updateDominantNarrative(region, actionNarrative, gain);
      addLog(state, `${FACTIONS[faction].name}: повестка в «${region.name}» +${gain} влияния.`);
      break;
    }
    case 'cultureProgram': {
      const festivalBoost = state.modifiers.culturalFestivalTurns > 0 ? 2 : 0;
      const trustGain = region.isCynicalZone ? 2 + festivalBoost : 4 + festivalBoost;
      region.trust[faction] += trustGain;
      region.resistance -= 2;
      region.influence[faction] += 1;
      addLog(state, `${FACTIONS[faction].name}: культурная программа в «${region.name}» (+${trustGain} доверия).`);
      break;
    }
    case 'counterNarrative': {
      const opponent = getLeadingOpponent(region, faction);
      const drop = 5 + (countMatches(region.currentIssue, actionNarrative) > 0 ? 1 : 0);
      region.influence[opponent] -= drop;
      region.fatigue += 2;
      region.resistance += 1;
      addLog(state, `${FACTIONS[faction].name}: контрнарратив против ${FACTIONS[opponent].name} в «${region.name}».`);
      break;
    }
    case 'factcheck': {
      const weakTrust = region.trust[faction] < 30;
      const trustGain = weakTrust ? 1 : region.isCynicalZone ? 2 : 3;
      region.trust[faction] += trustGain;
      region.fatigue -= 1;
      region.factCheckShield[faction] += 2;
      addLog(
        state,
        `${FACTIONS[faction].name}: фактчекинг в «${region.name}» (+${trustGain} доверия, щит от чужих кампаний).`
      );
      break;
    }
    case 'censorship': {
      const opponent = getLeadingOpponent(region, faction);
      const drop = faction === 'meridian' ? 8 : 6;
      region.mediaShare[opponent] -= drop;
      region.fatigue += 4;
      region.resistance += 3;
      region.trust[faction] -= region.openness > 60 ? 3 : 1;
      state.censorshipUsedSinceEvent[faction] += 1;
      addLog(state, `${FACTIONS[faction].name}: цензурный фильтр в «${region.name}» (краткосрочный контроль, долгосрочный риск).`);
      break;
    }
    case 'buildMediaNode': {
      region.mediaNodes[faction] += 1;
      region.mediaShare[faction] += 2;
      addLog(state, `${FACTIONS[faction].name}: медиаресурс построен в «${region.name}».`);
      break;
    }
  }

  normalizeRegion(region);
  region.infoController = getController(region);
  return true;
}

function applyNaturalUpkeep(state: GameState): void {
  for (const region of state.regions) {
    if (!region.hadCampaignThisTurn) {
      region.fatigue -= 1;
    }

    if (region.fatigue > 85) {
      for (const faction of Object.keys(FACTIONS) as FactionId[]) {
        region.trust[faction] -= 1;
      }
    }

    for (const faction of Object.keys(FACTIONS) as FactionId[]) {
      region.factCheckShield[faction] = Math.max(0, region.factCheckShield[faction] - 1);
    }

    region.hadCampaignThisTurn = false;
    normalizeRegion(region);
    region.infoController = getController(region);
  }
}

function applyWorldEvent(state: GameState): void {
  const index = Math.floor(Math.random() * WORLD_EVENTS.length);
  const event: WorldEvent = WORLD_EVENTS[index];
  state.currentEvent = event;
  state.modifiers.narrativeBoost = {
    security: 0,
    sovereignty: 0,
    development: 0,
    progress: 0,
    stability: 0,
    freedoms: 0
  };

  switch (event.id) {
    case 'border_incident': {
      state.modifiers.narrativeBoost.security = 2;
      state.modifiers.narrativeBoost.sovereignty = 2;
      break;
    }
    case 'economic_downturn': {
      state.modifiers.narrativeBoost.development = 3;
      break;
    }
    case 'tech_breakthrough': {
      state.modifiers.narrativeBoost.progress = 3;
      break;
    }
    case 'censorship_scandal': {
      for (const faction of Object.keys(FACTIONS) as FactionId[]) {
        if (state.censorshipUsedSinceEvent[faction] <= 0) {
          continue;
        }
        for (const region of state.regions) {
          region.trust[faction] -= 3;
          normalizeRegion(region);
        }
      }
      break;
    }
    case 'cultural_festival': {
      state.modifiers.culturalFestivalTurns = 2;
      break;
    }
    case 'fatigue_wave': {
      for (const region of state.regions) {
        if (region.fatigue > 60) {
          region.resistance += 5;
          normalizeRegion(region);
        }
      }
      break;
    }
  }

  state.censorshipUsedSinceEvent = { atlas: 0, meridian: 0, concordat: 0 };
  addLog(state, `Мировое событие: ${event.name}. ${event.description}`);
}

function calculateIncome(state: GameState): GameResources {
  const player = state.playerFaction;
  let influence = 0;
  let mediaPower = 0;
  let trust = 0;
  let culture = 0;

  for (const region of state.regions) {
    if (region.infoController === player) {
      influence += 2;
      if (region.type === 'Культурный центр') {
        culture += 1;
      }
    }

    if (region.mediaShare[player] > 50) {
      mediaPower += 1;
    }

    if (region.trust[player] > 60) {
      trust += 1;
    }
  }

  return {
    influence,
    mediaPower,
    trust,
    culture,
    attention: 2
  };
}

function updateResources(resources: GameResources, income: GameResources): GameResources {
  const next = { ...resources };
  for (const key of RESOURCE_KEYS) {
    next[key] = clamp(next[key] + income[key], 0, 200);
  }
  return next;
}

function getControlCount(state: GameState, faction: FactionId): number {
  return state.regions.filter((region) => region.infoController === faction).length;
}

function getSpecialRegionControlRatio(state: GameState, faction: FactionId): number {
  const special = state.regions.filter(
    (region) => region.type === 'Нейтральный регион' || region.type === 'Спорная зона'
  );

  if (special.length === 0) {
    return 0;
  }

  const owned = special.filter((region) => region.infoController === faction).length;
  return owned / special.length;
}

function evaluateVictory(state: GameState): void {
  const regionTotal = state.regions.length;
  const player = state.playerFaction;
  const aiFactions = (Object.keys(FACTIONS) as FactionId[]).filter((id) => id !== player);

  for (const faction of Object.keys(FACTIONS) as FactionId[]) {
    const ratio = getControlCount(state, faction) / regionTotal;
    if (ratio >= 0.6) {
      state.consecutiveMajority[faction] += 1;
    } else {
      state.consecutiveMajority[faction] = 0;
    }
  }

  const playerSpecialRatio = getSpecialRegionControlRatio(state, player);

  if (state.consecutiveMajority[player] >= 3 || playerSpecialRatio >= 0.75) {
    state.victory = {
      winner: player,
      loser: false,
      reason: 'Победа: доминирование повестки в ключевых регионах.'
    };
    return;
  }

  for (const ai of aiFactions) {
    const specialRatio = getSpecialRegionControlRatio(state, ai);
    if (state.consecutiveMajority[ai] >= 3 || specialRatio >= 0.75) {
      state.victory = {
        winner: ai,
        loser: true,
        reason: `Поражение: ${FACTIONS[ai].name} захватил информационную инициативу.`
      };
      return;
    }
  }

  const avgFatigue = state.regions.reduce((sum, region) => sum + region.fatigue, 0) / state.regions.length;
  const avgTrustPlayer =
    state.regions.reduce((sum, region) => sum + region.trust[player], 0) / state.regions.length;

  if (avgFatigue > 80 && avgTrustPlayer < 30) {
    state.victory = {
      winner: null,
      loser: true,
      reason: 'Поражение: кризис доверия и тотальная усталость аудитории.'
    };
  }
}

export function getActionPreview(
  state: GameState,
  region: Region | null,
  actionId: ActionId,
  narrativeId?: NarrativeId
): ActionPreview {
  if (!region) {
    return { lines: ['Выберите регион на карте.'], risk: ACTIONS[actionId].risk };
  }

  const faction = state.playerFaction;
  const narrative = narrativeId ?? FACTIONS[faction].preferredNarratives[0];
  const lines: string[] = [];

  switch (actionId) {
    case 'promote': {
      const gain = getPromoteGain(state, region, faction, narrative);
      lines.push(`Влияние: +${gain}`);
      lines.push(`Медиадоля: +${Math.round(gain * 0.6)}`);
      lines.push('Усталость: +3');
      break;
    }
    case 'cultureProgram':
      lines.push(`Доверие: +${region.isCynicalZone ? 2 : 4}`);
      lines.push('Сопротивление: -2');
      lines.push('Влияние: +1');
      break;
    case 'counterNarrative': {
      const opponent = getLeadingOpponent(region, faction);
      lines.push(`Влияние ${FACTIONS[opponent].name}: -5..-6`);
      lines.push('Усталость: +2');
      lines.push('Сопротивление: +1');
      break;
    }
    case 'factcheck':
      lines.push(`Доверие: +${region.trust[faction] < 30 ? 1 : 3}`);
      lines.push('Усталость: -1');
      lines.push('Щит от чужих кампаний: +2 хода');
      break;
    case 'censorship': {
      const opponent = getLeadingOpponent(region, faction);
      lines.push(`Медиадоля ${FACTIONS[opponent].name}: -6`);
      lines.push('Усталость: +4');
      lines.push(`Доверие к вам: -${region.openness > 60 ? 3 : 1}`);
      break;
    }
    case 'buildMediaNode':
      lines.push('Медианод: +1');
      lines.push('Медиадоля: +2');
      lines.push('Долгосрочное усиление кампаний');
      break;
  }

  return { lines, risk: ACTIONS[actionId].risk };
}

export function applyPlayerAction(
  state: GameState,
  regionId: string,
  actionId: ActionId,
  narrativeId?: NarrativeId
): GameState {
  if (state.actionsLeft <= 0) {
    return state;
  }

  const next = deepCloneState(state);
  const success = applyAction(next, next.playerFaction, regionId, actionId, narrativeId, true);
  if (!success) {
    addLog(next, 'Недостаточно ресурсов или действие недоступно.');
    return next;
  }

  evaluateVictory(next);
  return next;
}

export function endTurn(state: GameState): GameState {
  if (state.victory.winner || state.victory.loser) {
    return state;
  }

  const next = deepCloneState(state);
  const aiFactions = (Object.keys(FACTIONS) as FactionId[]).filter((id) => id !== next.playerFaction);

  for (const faction of aiFactions) {
    const plans = planAiActions(next, faction);
    for (const plan of plans.slice(0, 2)) {
      applyAction(next, faction, plan.regionId, plan.actionId, plan.narrativeId, false);
    }
  }

  applyNaturalUpkeep(next);

  if (next.modifiers.culturalFestivalTurns > 0) {
    next.modifiers.culturalFestivalTurns -= 1;
  }

  const income = calculateIncome(next);
  next.resources = updateResources(next.resources, income);
  addLog(
    next,
    `Доход хода: +${income.influence} влияния, +${income.attention} внимания, +${income.trust} доверия, +${income.mediaPower} медиамощности, +${income.culture} культурного капитала.`
  );

  next.turn += 1;
  next.actionsLeft = PLAYER_ACTIONS_PER_TURN;

  if (next.turn % 3 === 0) {
    applyWorldEvent(next);
  }

  evaluateVictory(next);
  return next;
}

export function getControlProgress(state: GameState, faction: FactionId): { ratio: number; consecutive: number } {
  const count = getControlCount(state, faction);
  return {
    ratio: count / state.regions.length,
    consecutive: state.consecutiveMajority[faction]
  };
}

export function canPlayerUseAction(state: GameState, actionId: ActionId): boolean {
  const action = ACTIONS[actionId];
  return canPay(state.resources, action.cost as Partial<Record<keyof GameResources, number>>);
}
