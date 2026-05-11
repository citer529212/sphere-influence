import { ControllerId, FactionId, Landform, LandmassId, NarrativeId, PoliticalOwnerId, Region, RegionType } from './types';

type AtlasSeed = {
  id: string;
  name: string;
  type: RegionType;
  landform: Landform;
  landmass: LandmassId;
  politicalOwner: PoliticalOwnerId;
  infoController: ControllerId;
  dominantNarrative: NarrativeId;
  openness: number;
  resistance: number;
  fatigue: number;
  currentIssue: string[];
  culturalProfile: string[];
};

const LAND_BONUS: Record<Landform, { influence: number; trust: number; media: number; elite: number }> = {
  mainland: { influence: 1, trust: 0, media: 1, elite: 1 },
  coast: { influence: 1, trust: 1, media: 2, elite: 0 },
  island: { influence: 0, trust: 1, media: 1, elite: -1 },
  archipelago: { influence: 0, trust: 1, media: 2, elite: -1 },
  strait: { influence: 1, trust: -1, media: 2, elite: 1 },
  sea_lane: { influence: 1, trust: -1, media: 3, elite: -1 },
  mountain: { influence: 2, trust: -2, media: -1, elite: 3 },
  delta: { influence: 1, trust: 1, media: 3, elite: 0 },
  buffer: { influence: 1, trust: 0, media: 0, elite: 0 }
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function seedStats(region: AtlasSeed): Pick<Region, 'influence' | 'trust' | 'mediaShare' | 'eliteLoyalty'> {
  const factions: FactionId[] = ['atlas', 'meridian', 'concordat'];
  const influence: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };
  const trust: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };
  const mediaShare: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };
  const eliteLoyalty: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };

  for (const faction of factions) {
    const ownerBonus = region.politicalOwner === faction ? 16 : 0;
    const infoBonus = region.infoController === faction ? 10 : 0;
    const issueBonus = region.currentIssue.includes('technology') && faction === 'concordat'
      ? 3
      : region.currentIssue.includes('history') && faction === 'meridian'
        ? 2
        : region.currentIssue.includes('rights') && faction === 'atlas'
          ? 2
          : 0;

    const form = LAND_BONUS[region.landform];

    influence[faction] = clamp(Math.round(18 + ownerBonus + infoBonus + issueBonus + form.influence + region.openness * 0.08 - region.resistance * 0.05));
    trust[faction] = clamp(Math.round(20 + ownerBonus * 0.45 + infoBonus * 0.35 + form.trust + region.openness * 0.1 - region.resistance * 0.06));
    mediaShare[faction] = clamp(Math.round(19 + ownerBonus * 0.35 + infoBonus * 0.65 + form.media + region.openness * 0.09));
    eliteLoyalty[faction] = clamp(Math.round(17 + ownerBonus * 0.9 + form.elite + (region.type === 'Закрытый регион' ? 4 : 0)));
  }

  return { influence, trust, mediaShare, eliteLoyalty };
}

function toRegion(seed: AtlasSeed, index: number): Region {
  const stats = seedStats(seed);
  return {
    id: seed.id,
    x: index,
    y: 0,
    name: seed.name,
    type: seed.type,
    landform: seed.landform,
    landmass: seed.landmass,
    politicalOwner: seed.politicalOwner,
    infoController: seed.infoController,
    dominantNarrative: seed.dominantNarrative,
    openness: seed.openness,
    resistance: seed.resistance,
    fatigue: seed.fatigue,
    currentIssue: seed.currentIssue,
    culturalProfile: seed.culturalProfile,
    influence: stats.influence,
    trust: stats.trust,
    mediaShare: stats.mediaShare,
    eliteLoyalty: stats.eliteLoyalty,
    mediaNodes: { atlas: 0, meridian: 0, concordat: 0 },
    factCheckShield: { atlas: 0, meridian: 0, concordat: 0 },
    hadCampaignThisTurn: false,
    isCynicalZone: seed.fatigue > 70
  };
}

const ATLAS_SEEDS: AtlasSeed[] = [
  { id: 'mist-isles', name: 'Туманные Острова', type: 'Культурный центр', landform: 'island', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'freedoms', openness: 66, resistance: 24, fatigue: 19, currentIssue: ['rights', 'openness'], culturalProfile: ['острова', 'университет'] },
  { id: 'northern-reef', name: 'Северный Риф', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'security', openness: 60, resistance: 30, fatigue: 21, currentIssue: ['security', 'threat'], culturalProfile: ['риф', 'логистика'] },
  { id: 'polar-coast', name: 'Полярный Берег', type: 'Метрополия', landform: 'coast', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'security', openness: 58, resistance: 33, fatigue: 22, currentIssue: ['security', 'order'], culturalProfile: ['порт', 'вещание'] },
  { id: 'storm-archipelago', name: 'Штормовой Архипелаг', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'sovereignty', openness: 56, resistance: 34, fatigue: 23, currentIssue: ['independence', 'security'], culturalProfile: ['архипелаг', 'флот'] },
  { id: 'deep-bay', name: 'Глубокая Бухта', type: 'Культурный центр', landform: 'coast', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'development', openness: 62, resistance: 29, fatigue: 20, currentIssue: ['economy', 'growth'], culturalProfile: ['гавань', 'студии'] },
  { id: 'wind-isles', name: 'Острова Ветров', type: 'Буфер', landform: 'island', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'progress', openness: 64, resistance: 28, fatigue: 21, currentIssue: ['future', 'technology'], culturalProfile: ['ветропарк', 'острова'] },
  { id: 'southern-equator', name: 'Южный Экватор', type: 'Культурный центр', landform: 'island', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'freedoms', openness: 67, resistance: 26, fatigue: 19, currentIssue: ['rights', 'accountability'], culturalProfile: ['медиа', 'курорт'] },

  { id: 'north-isthmus', name: 'Северный Перешеек', type: 'Буфер', landform: 'buffer', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'contested', dominantNarrative: 'security', openness: 45, resistance: 44, fatigue: 28, currentIssue: ['security', 'sovereignty'], culturalProfile: ['перешеек', 'таможня'] },
  { id: 'stone-strait', name: 'Каменный Пролив', type: 'Спорная зона', landform: 'strait', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'meridian', dominantNarrative: 'sovereignty', openness: 43, resistance: 49, fatigue: 30, currentIssue: ['history', 'threat'], culturalProfile: ['пролив', 'гарнизон'] },
  { id: 'fog-isthmus', name: 'Туманный Перешеек', type: 'Буфер', landform: 'buffer', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'contested', dominantNarrative: 'stability', openness: 47, resistance: 42, fatigue: 27, currentIssue: ['institutions', 'order'], culturalProfile: ['логистика', 'перевалка'] },
  { id: 'south-strait', name: 'Южный Пролив', type: 'Спорная зона', landform: 'strait', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'atlas', dominantNarrative: 'security', openness: 49, resistance: 41, fatigue: 26, currentIssue: ['security', 'infrastructure'], culturalProfile: ['маршруты', 'флот'] },

  { id: 'northern-hills', name: 'Северные Холмы', type: 'Закрытый регион', landform: 'mountain', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'sovereignty', openness: 34, resistance: 54, fatigue: 24, currentIssue: ['history', 'order'], culturalProfile: ['горняки', 'традиции'] },
  { id: 'volcanic-plateau', name: 'Вулканическое Плато', type: 'Закрытый регион', landform: 'mountain', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'stability', openness: 30, resistance: 58, fatigue: 26, currentIssue: ['stability', 'institutions'], culturalProfile: ['плато', 'архив'] },
  { id: 'rocky-lands', name: 'Скальные Земли', type: 'Буфер', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'security', openness: 36, resistance: 52, fatigue: 25, currentIssue: ['order', 'security'], culturalProfile: ['карниз', 'гарнизон'] },
  { id: 'heart-meridian', name: 'Сердце Меридиана', type: 'Метрополия', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'sovereignty', openness: 38, resistance: 50, fatigue: 24, currentIssue: ['institutions', 'history'], culturalProfile: ['столица', 'институты'] },
  { id: 'crimson-canyon', name: 'Багровый Каньон', type: 'Спорная зона', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'concordat', dominantNarrative: 'freedoms', openness: 52, resistance: 46, fatigue: 29, currentIssue: ['growth', 'openness'], culturalProfile: ['каньон', 'коридор'] },
  { id: 'ash-plains', name: 'Пепельные Равнины', type: 'Буфер', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'development', openness: 41, resistance: 48, fatigue: 27, currentIssue: ['economy', 'order'], culturalProfile: ['равнины', 'промзона'] },
  { id: 'southern-valleys', name: 'Южные Долины', type: 'Буфер', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'development', openness: 39, resistance: 50, fatigue: 28, currentIssue: ['growth', 'infrastructure'], culturalProfile: ['долины', 'фермы'] },

  { id: 'iris-delta', name: 'Дельта Ириды', type: 'Технологический хаб', landform: 'delta', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'progress', openness: 74, resistance: 24, fatigue: 19, currentIssue: ['technology', 'future'], culturalProfile: ['дельта', 'платформы'] },
  { id: 'emerald-delta', name: 'Изумрудная Дельта', type: 'Технологический хаб', landform: 'delta', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'development', openness: 72, resistance: 25, fatigue: 20, currentIssue: ['growth', 'infrastructure'], culturalProfile: ['порты', 'инновации'] },
  { id: 'central-delta', name: 'Центральная Дельта', type: 'Культурный центр', landform: 'mainland', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'stability', openness: 68, resistance: 28, fatigue: 22, currentIssue: ['institutions', 'growth'], culturalProfile: ['образование', 'порт'] },
  { id: 'river-belt', name: 'Речной Пояс', type: 'Буфер', landform: 'delta', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'development', openness: 66, resistance: 30, fatigue: 23, currentIssue: ['infrastructure', 'economy'], culturalProfile: ['реки', 'логистика'] },
  { id: 'technopolis', name: 'Технополис', type: 'Метрополия', landform: 'mainland', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'progress', openness: 76, resistance: 23, fatigue: 18, currentIssue: ['technology', 'youth'], culturalProfile: ['кампусы', 'стартапы'] },
  { id: 'eastern-node', name: 'Восточный Узел', type: 'Технологический хаб', landform: 'sea_lane', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'freedoms', openness: 72, resistance: 27, fatigue: 22, currentIssue: ['rights', 'technology'], culturalProfile: ['узел', 'платформа'] },
  { id: 'weaver-isles', name: 'Острова Ткачей', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'southern_ocean', politicalOwner: 'neutral', infoController: 'concordat', dominantNarrative: 'development', openness: 67, resistance: 29, fatigue: 22, currentIssue: ['growth', 'future'], culturalProfile: ['архипелаг', 'ремесло'] },
  { id: 'southern-archipelago', name: 'Южный Архипелаг', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'southern_ocean', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'freedoms', openness: 70, resistance: 27, fatigue: 21, currentIssue: ['openness', 'rights'], culturalProfile: ['острова', 'туризм'] }

];

export const ATLAS_MAP_REGIONS: Region[] = ATLAS_SEEDS.map(toRegion);
