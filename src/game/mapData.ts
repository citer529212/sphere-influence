import { ControllerId, FactionId, Landform, LandmassId, NarrativeId, PoliticalOwnerId, Region, RegionType } from './types';

type SeedInput = {
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

const LANDMASS_AFFINITY: Record<LandmassId, FactionId | null> = {
  atlas_west: 'atlas',
  meridian_core: 'meridian',
  concordat_east: 'concordat',
  neutral_belt: null,
  southern_ocean: null
};

const LANDFORM_BONUS: Record<Landform, { influence: number; trust: number; media: number; elite: number }> = {
  mainland: { influence: 1, trust: 0, media: 0, elite: 1 },
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

function buildFactionStats(seed: SeedInput): Pick<Region, 'influence' | 'trust' | 'mediaShare' | 'eliteLoyalty'> {
  const factions: FactionId[] = ['atlas', 'meridian', 'concordat'];
  const influence: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };
  const trust: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };
  const mediaShare: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };
  const eliteLoyalty: Record<FactionId, number> = { atlas: 0, meridian: 0, concordat: 0 };

  for (const faction of factions) {
    const ownerBonus = seed.politicalOwner === faction ? 16 : 0;
    const infoBonus = seed.infoController === faction ? 10 : 0;
    const affinityBonus = LANDMASS_AFFINITY[seed.landmass] === faction ? 5 : 0;
    const issueBonus = seed.currentIssue.includes('technology') && faction === 'concordat'
      ? 3
      : seed.currentIssue.includes('security') && faction === 'meridian'
        ? 2
        : seed.currentIssue.includes('rights') && faction === 'atlas'
          ? 2
          : 0;

    const form = LANDFORM_BONUS[seed.landform];

    influence[faction] = clamp(Math.round(18 + ownerBonus + infoBonus + affinityBonus + issueBonus + form.influence + seed.openness * 0.08 - seed.resistance * 0.05));
    trust[faction] = clamp(Math.round(20 + ownerBonus * 0.45 + infoBonus * 0.35 + form.trust + seed.openness * 0.1 - seed.resistance * 0.06));
    mediaShare[faction] = clamp(Math.round(19 + ownerBonus * 0.35 + infoBonus * 0.65 + form.media + seed.openness * 0.09));
    eliteLoyalty[faction] = clamp(Math.round(17 + ownerBonus * 0.9 + form.elite + (seed.type === 'Закрытый регион' ? 4 : 0)));
  }

  return { influence, trust, mediaShare, eliteLoyalty };
}

function buildRegion(seed: SeedInput, index: number): Region {
  const stats = buildFactionStats(seed);

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

const SEED_INPUTS: SeedInput[] = [
  { id: 'atlas-port', name: 'Атлант-Порт', type: 'Метрополия', landform: 'coast', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'freedoms', openness: 62, resistance: 28, fatigue: 18, currentIssue: ['rights', 'openness'], culturalProfile: ['порт', 'медиа'] },
  { id: 'mist-isles', name: 'Туманные о-ва', type: 'Культурный центр', landform: 'island', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'freedoms', openness: 64, resistance: 26, fatigue: 20, currentIssue: ['accountability', 'rights'], culturalProfile: ['острова', 'университет'] },
  { id: 'northern-reef', name: 'Северный Риф', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'security', openness: 58, resistance: 31, fatigue: 21, currentIssue: ['security', 'threat'], culturalProfile: ['риф', 'логистика'] },
  { id: 'storm-arc', name: 'Штормовой арх.', type: 'Нейтральный регион', landform: 'island', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'security', openness: 56, resistance: 35, fatigue: 23, currentIssue: ['order', 'security'], culturalProfile: ['архипелаг', 'флот'] },
  { id: 'deep-bay', name: 'Глубокая Бухта', type: 'Культурный центр', landform: 'coast', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'development', openness: 61, resistance: 29, fatigue: 19, currentIssue: ['economy', 'growth'], culturalProfile: ['гавань', 'студии'] },
  { id: 'western-broadcast', name: 'Западный Рубеж', type: 'Технологический хаб', landform: 'sea_lane', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'progress', openness: 63, resistance: 32, fatigue: 22, currentIssue: ['technology', 'infrastructure'], culturalProfile: ['кабель', 'медиа'] },
  { id: 'drifting-isles', name: 'Дрейфующие о-ва', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'southern_ocean', politicalOwner: 'neutral', infoController: 'atlas', dominantNarrative: 'development', openness: 59, resistance: 33, fatigue: 24, currentIssue: ['growth', 'economy'], culturalProfile: ['острова', 'торговля'] },
  { id: 'sunset-docks', name: 'Закатные Доки', type: 'Буфер', landform: 'coast', landmass: 'atlas_west', politicalOwner: 'neutral', infoController: 'atlas', dominantNarrative: 'freedoms', openness: 60, resistance: 34, fatigue: 25, currentIssue: ['rights', 'growth'], culturalProfile: ['доки', 'логистика'] },
  { id: 'southern-equator', name: 'Южный Экватор', type: 'Культурный центр', landform: 'island', landmass: 'atlas_west', politicalOwner: 'atlas', infoController: 'atlas', dominantNarrative: 'freedoms', openness: 65, resistance: 27, fatigue: 20, currentIssue: ['openness', 'accountability'], culturalProfile: ['курорт', 'медиа'] },

  { id: 'northern-isthmus', name: 'Северный Перешеек', type: 'Буфер', landform: 'buffer', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'contested', dominantNarrative: 'security', openness: 45, resistance: 44, fatigue: 27, currentIssue: ['security', 'sovereignty'], culturalProfile: ['перешеек', 'таможня'] },
  { id: 'stone-strait', name: 'Каменный Пролив', type: 'Спорная зона', landform: 'strait', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'meridian', dominantNarrative: 'sovereignty', openness: 42, resistance: 49, fatigue: 30, currentIssue: ['history', 'threat'], culturalProfile: ['пролив', 'гарнизон'] },
  { id: 'fog-isthmus', name: 'Туманный Перешеек', type: 'Буфер', landform: 'buffer', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'contested', dominantNarrative: 'stability', openness: 46, resistance: 43, fatigue: 28, currentIssue: ['institutions', 'order'], culturalProfile: ['логистика', 'перевалка'] },
  { id: 'southern-strait', name: 'Южный Пролив', type: 'Спорная зона', landform: 'strait', landmass: 'neutral_belt', politicalOwner: 'neutral', infoController: 'atlas', dominantNarrative: 'security', openness: 49, resistance: 41, fatigue: 26, currentIssue: ['security', 'infrastructure'], culturalProfile: ['маршруты', 'флот'] },

  { id: 'northern-hills', name: 'Северные Холмы', type: 'Закрытый регион', landform: 'mountain', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'development', openness: 34, resistance: 54, fatigue: 24, currentIssue: ['history', 'order'], culturalProfile: ['горняки', 'традиции'] },
  { id: 'volcanic-plateau', name: 'Вулканическое Плато', type: 'Закрытый регион', landform: 'mountain', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'stability', openness: 30, resistance: 57, fatigue: 26, currentIssue: ['stability', 'institutions'], culturalProfile: ['плато', 'архив'] },
  { id: 'rocky-lands', name: 'Скальные Земли', type: 'Буфер', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'sovereignty', openness: 36, resistance: 51, fatigue: 25, currentIssue: ['sovereignty', 'history'], culturalProfile: ['карниз', 'гарнизон'] },
  { id: 'heart-meridian', name: 'Сердце Меридиана', type: 'Метрополия', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'sovereignty', openness: 37, resistance: 50, fatigue: 24, currentIssue: ['institutions', 'history'], culturalProfile: ['столица', 'институты'] },
  { id: 'crimson-canyon', name: 'Багровый Каньон', type: 'Спорная зона', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'concordat', dominantNarrative: 'freedoms', openness: 52, resistance: 46, fatigue: 29, currentIssue: ['growth', 'openness'], culturalProfile: ['каньон', 'коридор'] },
  { id: 'ash-plains', name: 'Пепельные Равнины', type: 'Буфер', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'development', openness: 40, resistance: 48, fatigue: 27, currentIssue: ['economy', 'order'], culturalProfile: ['равнины', 'промзона'] },
  { id: 'eastern-hills', name: 'Восточные Холмы', type: 'Закрытый регион', landform: 'mountain', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'security', openness: 33, resistance: 55, fatigue: 28, currentIssue: ['threat', 'security'], culturalProfile: ['высоты', 'батареи'] },
  { id: 'iron-ridges', name: 'Железные Кряжи', type: 'Закрытый регион', landform: 'mountain', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'stability', openness: 31, resistance: 58, fatigue: 30, currentIssue: ['stability', 'order'], culturalProfile: ['кряжи', 'контроль'] },
  { id: 'southern-valleys', name: 'Южные Долины', type: 'Буфер', landform: 'mainland', landmass: 'meridian_core', politicalOwner: 'meridian', infoController: 'meridian', dominantNarrative: 'development', openness: 39, resistance: 50, fatigue: 28, currentIssue: ['growth', 'infrastructure'], culturalProfile: ['долины', 'фермы'] },

  { id: 'iris-delta', name: 'Дельта Ириды', type: 'Технологический хаб', landform: 'delta', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'progress', openness: 73, resistance: 24, fatigue: 19, currentIssue: ['technology', 'future'], culturalProfile: ['дельта', 'платформы'] },
  { id: 'emerald-delta', name: 'Изумрудная Дельта', type: 'Технологический хаб', landform: 'delta', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'development', openness: 71, resistance: 25, fatigue: 20, currentIssue: ['growth', 'infrastructure'], culturalProfile: ['порты', 'инновации'] },
  { id: 'central-delta', name: 'Центральная Дельта', type: 'Культурный центр', landform: 'mainland', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'stability', openness: 68, resistance: 28, fatigue: 22, currentIssue: ['institutions', 'growth'], culturalProfile: ['образование', 'порт'] },
  { id: 'river-belt', name: 'Речной Пояс', type: 'Буфер', landform: 'delta', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'development', openness: 66, resistance: 30, fatigue: 23, currentIssue: ['infrastructure', 'economy'], culturalProfile: ['реки', 'логистика'] },
  { id: 'eastern-node', name: 'Восточный Узел 4-6', type: 'Технологический хаб', landform: 'sea_lane', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'freedoms', openness: 72, resistance: 27, fatigue: 22, currentIssue: ['rights', 'technology'], culturalProfile: ['узел', 'платформа'] },
  { id: 'technopolis', name: 'Технополис', type: 'Метрополия', landform: 'mainland', landmass: 'concordat_east', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'progress', openness: 76, resistance: 23, fatigue: 18, currentIssue: ['technology', 'youth'], culturalProfile: ['кампусы', 'стартапы'] },
  { id: 'weaver-isles', name: 'Острова Ткачей', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'southern_ocean', politicalOwner: 'neutral', infoController: 'concordat', dominantNarrative: 'development', openness: 67, resistance: 29, fatigue: 22, currentIssue: ['growth', 'future'], culturalProfile: ['архипелаг', 'ремесло'] },
  { id: 'southern-archipelago', name: 'Южный Архипелаг', type: 'Нейтральный регион', landform: 'archipelago', landmass: 'southern_ocean', politicalOwner: 'concordat', infoController: 'concordat', dominantNarrative: 'freedoms', openness: 70, resistance: 27, fatigue: 21, currentIssue: ['openness', 'rights'], culturalProfile: ['острова', 'туризм'] },
  { id: 'data-port', name: 'Порт Данных', type: 'Спорная зона', landform: 'sea_lane', landmass: 'concordat_east', politicalOwner: 'neutral', infoController: 'concordat', dominantNarrative: 'progress', openness: 69, resistance: 31, fatigue: 24, currentIssue: ['technology', 'infrastructure'], culturalProfile: ['дата-центр', 'кабель'] },

  { id: 'node-t1', name: 'Узел Т-1', type: 'Нейтральный регион', landform: 'sea_lane', landmass: 'southern_ocean', politicalOwner: 'neutral', infoController: 'atlas', dominantNarrative: 'security', openness: 53, resistance: 37, fatigue: 24, currentIssue: ['security', 'infrastructure'], culturalProfile: ['кабельный узел', 'трафик'] },
  { id: 'node-k1', name: 'Узел К-1', type: 'Нейтральный регион', landform: 'sea_lane', landmass: 'southern_ocean', politicalOwner: 'neutral', infoController: 'concordat', dominantNarrative: 'progress', openness: 58, resistance: 35, fatigue: 22, currentIssue: ['technology', 'future'], culturalProfile: ['кабельный узел', 'платформы'] },
  { id: 'node-k2', name: 'Узел К-2', type: 'Нейтральный регион', landform: 'sea_lane', landmass: 'southern_ocean', politicalOwner: 'neutral', infoController: 'concordat', dominantNarrative: 'development', openness: 57, resistance: 36, fatigue: 23, currentIssue: ['growth', 'infrastructure'], culturalProfile: ['морской узел', 'каналы'] }
];

export const MAP_REGIONS: Region[] = SEED_INPUTS.map(buildRegion);
