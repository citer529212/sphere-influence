import { FACTIONS } from './data';
import { ActionId, FactionId, GameState, NarrativeId, PlannedAction, Region } from './types';

function scoreRegionForMeridian(region: Region, faction: FactionId): number {
  let score = 0;
  if (region.politicalOwner === faction) {
    score += 20;
  }
  if (region.infoController !== faction) {
    score += 14;
  }
  if (region.type === 'Закрытый регион' || region.type === 'Буфер') {
    score += 8;
  }
  score += 100 - region.trust[faction];
  score += region.mediaShare[faction] < 45 ? 6 : 0;
  return score;
}

function scoreRegionForConcordat(region: Region, faction: FactionId): number {
  if (region.fatigue > 70) {
    return -999;
  }

  let score = 0;
  if (region.type === 'Нейтральный регион' || region.type === 'Технологический хаб') {
    score += 18;
  }
  if (region.infoController !== faction) {
    score += 10;
  }
  if (region.type === 'Культурный центр') {
    score += 8;
  }
  score += region.openness * 0.1;
  score += Math.max(0, 60 - region.trust[faction]);
  return score;
}

function pickNarrative(faction: FactionId, region: Region): NarrativeId {
  const preferred = FACTIONS[faction].preferredNarratives;
  if (region.currentIssue.includes('technology') || region.currentIssue.includes('future')) {
    return preferred.includes('progress') ? 'progress' : preferred[0];
  }
  if (region.currentIssue.includes('economy') || region.currentIssue.includes('growth')) {
    return preferred.includes('development') ? 'development' : preferred[0];
  }
  if (region.currentIssue.includes('security') || region.currentIssue.includes('order')) {
    return preferred.includes('security') ? 'security' : preferred[0];
  }
  return preferred[0];
}

function chooseMeridianAction(region: Region): ActionId {
  if (region.infoController !== 'meridian' && region.openness < 62) {
    return Math.random() < 0.6 ? 'censorship' : 'promote';
  }
  if (region.mediaShare.meridian < 45) {
    return 'promote';
  }
  return Math.random() < 0.5 ? 'counterNarrative' : 'promote';
}

function chooseConcordatAction(region: Region): ActionId {
  if (region.mediaNodes.concordat === 0 && (region.type === 'Технологический хаб' || region.type === 'Нейтральный регион')) {
    return Math.random() < 0.45 ? 'buildMediaNode' : 'promote';
  }
  if (region.trust.concordat < 55) {
    return 'cultureProgram';
  }
  return Math.random() < 0.4 ? 'cultureProgram' : 'promote';
}

export function planAiActions(state: GameState, faction: FactionId): PlannedAction[] {
  const regions = state.regions.filter((region) =>
    faction === 'concordat' ? region.fatigue <= 70 : region.fatigue < 95
  );
  const ranked = [...regions].sort((a, b) => {
    const scoreA = faction === 'meridian' ? scoreRegionForMeridian(a, faction) : scoreRegionForConcordat(a, faction);
    const scoreB = faction === 'meridian' ? scoreRegionForMeridian(b, faction) : scoreRegionForConcordat(b, faction);
    return scoreB - scoreA;
  });

  const selected = ranked.slice(0, 4);
  const plans: PlannedAction[] = [];

  for (let i = 0; i < selected.length && plans.length < 2; i += 1) {
    const region = selected[i];
    const actionId = faction === 'meridian' ? chooseMeridianAction(region) : chooseConcordatAction(region);
    plans.push({
      faction,
      regionId: region.id,
      actionId,
      narrativeId: pickNarrative(faction, region)
    });
  }

  return plans;
}
