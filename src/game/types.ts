export type FactionId = 'atlas' | 'meridian' | 'concordat';
export type ControllerId = FactionId | 'contested';
export type PoliticalOwnerId = FactionId | 'neutral';

export type RegionType =
  | 'Метрополия'
  | 'Буфер'
  | 'Технологический хаб'
  | 'Культурный центр'
  | 'Закрытый регион'
  | 'Спорная зона'
  | 'Нейтральный регион'
  | 'Кризисный регион';

export type NarrativeId =
  | 'security'
  | 'sovereignty'
  | 'development'
  | 'progress'
  | 'stability'
  | 'freedoms';

export type ResourceId =
  | 'influence'
  | 'attention'
  | 'trust'
  | 'mediaPower'
  | 'culture';

export type ActionId =
  | 'promote'
  | 'cultureProgram'
  | 'counterNarrative'
  | 'factcheck'
  | 'censorship'
  | 'buildMediaNode';

export interface Faction {
  id: FactionId;
  name: string;
  color: string;
  border: string;
  style: string;
  strengths: string[];
  weakness: string;
  preferredNarratives: NarrativeId[];
}

export interface Narrative {
  id: NarrativeId;
  name: string;
  tags: string[];
}

export interface ActionDefinition {
  id: ActionId;
  name: string;
  cost: Partial<Record<ResourceId, number>>;
  effect: string;
  risk: string;
  dangerous?: boolean;
}

export interface Region {
  id: string;
  x: number;
  y: number;
  name: string;
  type: RegionType;
  politicalOwner: PoliticalOwnerId;
  infoController: ControllerId;
  landform: Landform;
  landmass: LandmassId;
  influence: Record<FactionId, number>;
  trust: Record<FactionId, number>;
  mediaShare: Record<FactionId, number>;
  eliteLoyalty: Record<FactionId, number>;
  openness: number;
  resistance: number;
  fatigue: number;
  dominantNarrative: NarrativeId;
  culturalProfile: string[];
  currentIssue: string[];
  mediaNodes: Record<FactionId, number>;
  factCheckShield: Record<FactionId, number>;
  hadCampaignThisTurn: boolean;
  isCynicalZone: boolean;
}

export interface WorldEvent {
  id:
    | 'border_incident'
    | 'economic_downturn'
    | 'tech_breakthrough'
    | 'censorship_scandal'
    | 'cultural_festival'
    | 'fatigue_wave';
  name: string;
  description: string;
}

export interface GameModifiers {
  narrativeBoost: Record<NarrativeId, number>;
  culturalFestivalTurns: number;
}

export interface GameResources {
  influence: number;
  attention: number;
  trust: number;
  mediaPower: number;
  culture: number;
}

export interface PlannedAction {
  faction: FactionId;
  regionId: string;
  actionId: ActionId;
  narrativeId?: NarrativeId;
}

export interface VictoryState {
  winner: FactionId | null;
  loser: boolean;
  reason: string | null;
}

export interface GameState {
  turn: number;
  playerFaction: FactionId;
  actionsLeft: number;
  regions: Region[];
  resources: GameResources;
  currentEvent: WorldEvent | null;
  log: string[];
  modifiers: GameModifiers;
  censorshipUsedSinceEvent: Record<FactionId, number>;
  consecutiveMajority: Record<FactionId, number>;
  victory: VictoryState;
}

export interface ActionPreview {
  lines: string[];
  risk: string;
}

export type Landform =
  | 'mainland'
  | 'coast'
  | 'island'
  | 'archipelago'
  | 'strait'
  | 'sea_lane'
  | 'mountain'
  | 'delta'
  | 'buffer';

export type LandmassId =
  | 'atlas_west'
  | 'meridian_core'
  | 'concordat_east'
  | 'neutral_belt'
  | 'southern_ocean';

export interface RegionVisual {
  id: string;
  path: string;
  labelX: number;
  labelY: number;
  iconX?: number;
  iconY?: number;
  icon?: 'anchor' | 'cable' | 'platform' | 'mountain' | 'delta' | 'port';
}
