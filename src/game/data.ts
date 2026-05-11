import { ActionDefinition, Faction, FactionId, GameState, Narrative, NarrativeId, Region, WorldEvent } from './types';
import { ATLAS_MAP_REGIONS } from './atlasMapData';

export const PLAYER_FACTION: FactionId = 'atlas';
export const PLAYER_ACTIONS_PER_TURN = 3;

export const FACTIONS: Record<FactionId, Faction> = {
  atlas: {
    id: 'atlas',
    name: 'Синий Атлас',
    color: '#2368a8',
    border: '#4db6ff',
    style: 'Глобальные сети, институты, кризисные кампании',
    strengths: ['Кризисные коммуникации', 'Быстрые кампании', 'Международные агентства'],
    weakness: 'Быстро создает усталость аудитории',
    preferredNarratives: ['security', 'freedoms', 'stability']
  },
  meridian: {
    id: 'meridian',
    name: 'Красный Меридиан',
    color: '#a83a44',
    border: '#ff5a66',
    style: 'История, суверенитет, централизованный контроль',
    strengths: ['Цензурный фильтр', 'Защита своих регионов', 'Исторические нарративы'],
    weakness: 'Слабее в открытых технологических регионах',
    preferredNarratives: ['sovereignty', 'stability', 'security']
  },
  concordat: {
    id: 'concordat',
    name: 'Золотой Конкордат',
    color: '#a8a63a',
    border: '#f6d84a',
    style: 'Техплатформы, культура, образование',
    strengths: ['Soft power', 'Культурные проекты', 'Технологический охват'],
    weakness: 'Слабая реакция на острые кризисы',
    preferredNarratives: ['development', 'progress', 'freedoms']
  }
};

export const NARRATIVES: Record<NarrativeId, Narrative> = {
  security: { id: 'security', name: 'Безопасность', tags: ['security', 'order', 'threat'] },
  sovereignty: { id: 'sovereignty', name: 'Суверенитет', tags: ['sovereignty', 'history', 'independence'] },
  development: { id: 'development', name: 'Развитие', tags: ['economy', 'growth', 'infrastructure'] },
  progress: { id: 'progress', name: 'Прогресс', tags: ['technology', 'youth', 'future'] },
  stability: { id: 'stability', name: 'Стабильность', tags: ['order', 'stability', 'institutions'] },
  freedoms: { id: 'freedoms', name: 'Свободы', tags: ['rights', 'openness', 'accountability'] }
};

export const ACTIONS: Record<string, ActionDefinition> = {
  promote: {
    id: 'promote',
    name: 'Продвинуть повестку',
    cost: { influence: 3, mediaPower: 2 },
    effect: 'Рост влияния и медиа-доли в регионе.',
    risk: 'Увеличивает усталость аудитории.'
  },
  cultureProgram: {
    id: 'cultureProgram',
    name: 'Культурная программа',
    cost: { culture: 3 },
    effect: 'Повышает доверие и немного снижает сопротивление.',
    risk: 'Медленный эффект.'
  },
  counterNarrative: {
    id: 'counterNarrative',
    name: 'Контрнарратив',
    cost: { attention: 3, influence: 2 },
    effect: 'Снижает влияние ведущего соперника.',
    risk: 'Повышает поляризацию и усталость.'
  },
  factcheck: {
    id: 'factcheck',
    name: 'Фактчекинг',
    cost: { trust: 2, attention: 2 },
    effect: 'Повышает доверие и ослабляет чужие кампании.',
    risk: 'Слабее при низком доверии.'
  },
  censorship: {
    id: 'censorship',
    name: 'Цензурный фильтр',
    cost: { mediaPower: 3 },
    effect: 'Снижает медиа-долю противника.',
    risk: 'Опасный краткосрочный инструмент: рост сопротивления и усталости.',
    dangerous: true
  },
  buildMediaNode: {
    id: 'buildMediaNode',
    name: 'Построить медиаресурс',
    cost: { influence: 5, mediaPower: 5 },
    effect: 'Создает медианод и усиливает будущие кампании.',
    risk: 'Нет мгновенного скачка влияния.'
  }
};

export const WORLD_EVENTS: WorldEvent[] = [
  { id: 'border_incident', name: 'Пограничный инцидент', description: 'Повестки Безопасности и Суверенитета получают импульс.' },
  { id: 'economic_downturn', name: 'Экономический спад', description: 'Нарратив Развития звучит убедительнее.' },
  { id: 'tech_breakthrough', name: 'Технологический прорыв', description: 'Нарратив Прогресса получает усиление.' },
  { id: 'censorship_scandal', name: 'Скандал цензуры', description: 'Доверие падает к тем, кто делал ставку на цензуру.' },
  { id: 'cultural_festival', name: 'Культурный фестиваль', description: 'Культурные программы работают заметно лучше.' },
  { id: 'fatigue_wave', name: 'Волна усталости', description: 'Сопротивление растет в перегретых регионах.' }
];

export function createInitialRegions(): Region[] {
  return structuredClone(ATLAS_MAP_REGIONS);
}

export function createInitialState(): GameState {
  return {
    turn: 1,
    playerFaction: PLAYER_FACTION,
    actionsLeft: PLAYER_ACTIONS_PER_TURN,
    regions: createInitialRegions(),
    resources: {
      influence: 12,
      attention: 10,
      trust: 10,
      mediaPower: 10,
      culture: 8
    },
    currentEvent: null,
    log: ['Партия началась: активна новая атласная SVG-карта регионов.'],
    modifiers: {
      narrativeBoost: {
        security: 0,
        sovereignty: 0,
        development: 0,
        progress: 0,
        stability: 0,
        freedoms: 0
      },
      culturalFestivalTurns: 0
    },
    censorshipUsedSinceEvent: { atlas: 0, meridian: 0, concordat: 0 },
    consecutiveMajority: { atlas: 0, meridian: 0, concordat: 0 },
    victory: {
      winner: null,
      loser: false,
      reason: null
    }
  };
}
