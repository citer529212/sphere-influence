import { REALMS, FACTION_IDS, climateEffect } from "./realms";
import { createInitialState } from "./data";
import { FactionId, Region } from "./types";
import {
  CITY_TOPICS,
  CITY_ROLES,
  CITY_SPECIALTIES,
  DIFFICULTIES,
  DifficultyId,
  MEDIA_LINKS,
  newsAt,
  TopicId,
  TOPICS,
} from "./information";
export type QuickAction = "media" | "attract" | "protect";
export type CampaignMemory = { topic: TopicId; repeats: number };
export type QuickState = {
  seed: string;
  player: FactionId;
  difficulty: DifficultyId;
  topic: TopicId;
  held: number;
  turn: number;
  actions: number;
  influence: number;
  trust: number;
  rivalBudget: Record<FactionId, number>;
  rivalTrust: Record<FactionId, number>;
  campaigns: Record<string, CampaignMemory>;
  regions: Region[];
  log: string[];
  result: "win" | "loss" | null;
};
export const RULESET_VERSION = "5",
  QUICK_TOTAL = 16,
  NEUTRAL_SUPPORT = 55;
// Upper bounds for validation; actual objectives come from the selected difficulty.
export const QUICK_LIMIT = 30;
export const QUICK_ACTIONS = {
  media: {
    name: "Медиацентр",
    cost: 5,
    description:
      "Редакция приносит доход, укрепляет поддержку и расширяет охват до двух связей. Торговые узлы и независимые редакции дают дополнительный бонус.",
    effect: "Доход, охват и устойчивая аудитория",
  },
  attract: {
    name: "Инфокампания",
    cost: 3,
    description:
      "Тема под местную повестку даёт +5 поддержки. Доверие, охват, информационный повод и усталость меняют результат.",
    effect: "Борьба за поддержку аудитории",
  },
  protect: {
    name: "Проверка фактов",
    cost: 2,
    description:
      "Восстанавливает доверие, снижает усталость и защищает аудиторию от одного ответа соперника.",
    effect: "Доверие и устойчивость поддержки",
  },
} as const;
export const objective = (state: QuickState) => DIFFICULTIES[state.difficulty];
export function dailySeed(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function hash(text: string): number {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function createQuickGame(
  seed: string,
  player: FactionId = "atlas",
  difficulty: DifficultyId = "standard",
): QuickState {
  const all = createInitialState().regions,
    ids = [
      "mist-isles",
      "northern-reef",
      "polar-coast",
      "deep-bay",
      "northern-hills",
      "heart-meridian",
      "volcanic-plateau",
      "crimson-canyon",
      "iris-delta",
      "emerald-delta",
      "southern-archipelago",
      "central-delta",
      "north-isthmus",
      "stone-strait",
      "fog-isthmus",
      "south-strait",
    ];
  const regions = ids.map((id, i) => {
    const region = structuredClone(all.find((r) => r.id === id)!);
    const owner = i < 12 ? FACTION_IDS[Math.floor(i / 4)] : "neutral";
    region.politicalOwner = owner;
    region.infoController = owner === "neutral" ? "contested" : owner;
    region.influence = { atlas: 18, meridian: 18, concordat: 18 };
    if (owner === "neutral")
      region.influence = { atlas: 8, meridian: 8, concordat: 8 };
    else region.influence[owner] = 62 + (hash(seed + id) % 10);
    region.mediaNodes = { atlas: 0, meridian: 0, concordat: 0 };
    region.factCheckShield = { atlas: 0, meridian: 0, concordat: 0 };
    region.fatigue = 0;
    return region;
  });
  const mode = DIFFICULTIES[difficulty];
  return {
    seed,
    player,
    difficulty,
    topic: "development",
    held: 0,
    turn: 1,
    actions: 2,
    influence: 14,
    trust: 65,
    rivalBudget: { atlas: 14, meridian: 14, concordat: 14 },
    rivalTrust: { atlas: 65, meridian: 65, concordat: 65 },
    campaigns: {},
    regions,
    log: [
      `Информационное лидерство в ${mode.goal} городах, доверие ${mode.trust}% и удержание ${mode.hold} ходов. Лимит: ${mode.limit}.`,
    ],
    result: null,
  };
}
export function decisionLimit(state: QuickState): number {
  return state.difficulty !== "discovery" &&
    state.turn >= 9 &&
    state.regions.filter(
      (r) =>
        r.infoController === state.player && r.mediaNodes[state.player] > 0,
    ).length >= 3
    ? 3
    : 2;
}
export function citySpecialty(state: QuickState, region: Region) {
  return CITY_SPECIALTIES[
    CITY_ROLES[state.regions.findIndex((r) => r.id === region.id)]
  ];
}
export function trustRecovery(
  state: QuickState,
  actor = state.player,
  region?: Region,
): number {
  return (
    REALMS[actor].trustRecovery +
    newsAt(state.turn).trustBonus +
    (region?.infoController === actor ? citySpecialty(state, region).trust : 0)
  );
}
export function controlled(state: QuickState): number {
  return state.regions.filter((r) => r.infoController === state.player).length;
}
export function supportLead(
  region: Region,
  player: FactionId = "atlas",
): number {
  return Math.max(
    ...FACTION_IDS.filter((f) => f !== player).map((f) => region.influence[f]),
  );
}
export function actionCost(
  state: QuickState,
  action: QuickAction,
  actor = state.player,
): number {
  return action === "media"
    ? REALMS[actor].mediaCost
    : QUICK_ACTIONS[action].cost;
}
export function factionIncome(state: QuickState, actor: FactionId): number {
  return (
    REALMS[actor].income +
    state.regions.reduce(
      (sum, r) =>
        sum +
        (r.infoController === actor
          ? r.mediaNodes[actor] * citySpecialty(state, r).income
          : 0),
      0,
    )
  );
}
export function turnIncome(state: QuickState): number {
  return factionIncome(state, state.player);
}
export function mediaReach(
  state: QuickState,
  actor = state.player,
): Set<number> {
  const reached = new Set<number>(),
    owned = state.regions.flatMap((r, i) =>
      r.infoController === actor ? [i] : [],
    );
  state.regions.forEach((r, i) => {
    if (r.politicalOwner === actor) reached.add(i);
  });
  for (const i of owned) {
    reached.add(i);
    for (const [a, b] of MEDIA_LINKS) {
      if (a === i) reached.add(b);
      if (b === i) reached.add(a);
    }
  }
  for (const i of owned.filter((i) => state.regions[i].mediaNodes[actor] > 0)) {
    const first = MEDIA_LINKS.flatMap(([a, b]) =>
      a === i ? [b] : b === i ? [a] : [],
    );
    for (const j of first)
      for (const [a, b] of MEDIA_LINKS) {
        if (a === j) reached.add(b);
        if (b === j) reached.add(a);
      }
  }
  return reached;
}
export function reachDescription(state: QuickState, region: Region): string {
  const i = state.regions.findIndex((r) => r.id === region.id);
  if (!mediaReach(state).has(i))
    return "Вне охвата: развивайте редакции или поддержку в связанных городах";
  return region.infoController === state.player
    ? "Местная аудитория · ваш охват"
    : region.politicalOwner === state.player
      ? "Домашняя редакционная сеть"
      : "Охват через партнёрскую медиасеть";
}
export function networkBonus(
  state: QuickState,
  region: Region,
  actor = state.player,
): number {
  const i = state.regions.findIndex((r) => r.id === region.id);
  return state.regions.some(
    (r, j) =>
      r.infoController === actor &&
      r.mediaNodes[actor] > 0 &&
      (i === j ||
        MEDIA_LINKS.some(
          ([a, b]) => (a === i && b === j) || (b === i && a === j),
        )),
  )
    ? 3
    : 0;
}
export function campaignGain(
  state: QuickState,
  region: Region,
  actor = state.player,
  topic = state.topic,
): number {
  const i = state.regions.findIndex((r) => r.id === region.id),
    trust = actor === state.player ? state.trust : state.rivalTrust[actor],
    news = newsAt(state.turn);
  return Math.max(
    7,
    20 +
      Math.floor(trust / 10) -
      Math.floor(region.fatigue / 8) +
      REALMS[actor].campaign +
      (topic === CITY_TOPICS[i] ? 5 : -3) +
      networkBonus(state, region, actor) +
      climateEffect(state.turn, i) +
      (news.topic === topic ? news.bonus : 0) -
      repeatPenalty(state, region, topic, actor),
  );
}
export function repeatPenalty(
  state: QuickState,
  region: Region,
  topic: TopicId,
  actor = state.player,
): number {
  const last = state.campaigns[`${actor}:${region.id}`];
  return last?.topic === topic ? Math.min(16, last.repeats * 8) : 0;
}
export function bestCampaignTopic(
  state: QuickState,
  region: Region,
  actor = state.player,
): TopicId {
  return (Object.keys(TOPICS) as TopicId[]).sort(
    (a, b) =>
      campaignGain(state, region, actor, b) -
      campaignGain(state, region, actor, a),
  )[0];
}
export function counterGain(
  state: QuickState,
  region: Region,
  actor = state.player,
  topic = state.topic,
  maxGain = Infinity,
): number {
  return Math.min(
    supportLead(region, actor),
    Math.max(
      2,
      Math.floor(
        Math.min(maxGain, campaignGain(state, region, actor, topic)) / 6,
      ),
    ),
  );
}
export function regionController(region: Region): Region["infoController"] {
  const ranked = [...FACTION_IDS].sort(
    (a, b) => region.influence[b] - region.influence[a],
  );
  if (
    region.politicalOwner === "neutral" &&
    region.influence[ranked[0]] < NEUTRAL_SUPPORT
  )
    return "contested";
  return region.influence[ranked[0]] - region.influence[ranked[1]] >= 5
    ? ranked[0]
    : "contested";
}
export function supportNeeded(region: Region, player: FactionId): number {
  return Math.max(
    0,
    supportLead(region, player) + 5 - region.influence[player],
    region.politicalOwner === "neutral"
      ? NEUTRAL_SUPPORT - region.influence[player]
      : 0,
  );
}
export function setCampaignTopic(
  state: QuickState,
  topic: TopicId,
): QuickState {
  return state.result || state.topic === topic ? state : { ...state, topic };
}
function trim(state: QuickState) {
  state.log = state.log.slice(0, 8);
}
export function actionError(
  state: QuickState,
  region: Region,
  action: QuickAction,
  actor = state.player,
): string | null {
  if (state.result) return "Партия завершена";
  if (actor === state.player && state.actions < 1) return "Завершите ход";
  if (
    (actor === state.player ? state.influence : state.rivalBudget[actor]) <
    actionCost(state, action, actor)
  )
    return "Не хватает медиаресурса";
  if (
    !mediaReach(state, actor).has(
      state.regions.findIndex((r) => r.id === region.id),
    )
  )
    return "Вне охвата медиасети";
  if (action === "media" && region.infoController !== actor)
    return "Нужно информационное лидерство";
  if (action === "media" && region.mediaNodes[actor] > 0)
    return "Редакция уже работает";
  return null;
}
function apply(
  state: QuickState,
  region: Region,
  action: QuickAction,
  actor: FactionId,
  topic: TopicId,
  maxGain = Infinity,
): { amount: number; captured: boolean } {
  const cost = actionCost(state, action, actor);
  if (actor === state.player) {
    state.influence -= cost;
    state.actions--;
  } else state.rivalBudget[actor] -= cost;
  const previous = region.infoController,
    before = region.influence[actor],
    trust = actor === state.player ? state.trust : state.rivalTrust[actor];
  let nextTrust = trust;
  if (action === "media") {
    region.mediaNodes[actor] = 1;
    state.log.unshift(
      `${REALMS[actor].name}: в «${region.name}» открыта редакция. Доход +${citySpecialty(state, region).income}, расширен охват.`,
    );
  }
  if (action === "attract") {
    const counter = counterGain(state, region, actor, topic, maxGain),
      rival = FACTION_IDS.filter((f) => f !== actor).sort(
        (a, b) => region.influence[b] - region.influence[a],
      )[0];
    region.influence[actor] = Math.min(
      100,
      before + Math.min(maxGain, campaignGain(state, region, actor, topic)),
    );
    region.influence[rival] = Math.max(0, region.influence[rival] - counter);
    const key = `${actor}:${region.id}`,
      last = state.campaigns[key];
    state.campaigns[key] = {
      topic,
      repeats: last?.topic === topic ? Math.min(2, last.repeats + 1) : 1,
    };
    region.fatigue = Math.min(100, region.fatigue + REALMS[actor].fatigue);
    nextTrust = Math.max(0, trust - REALMS[actor].trustCost);
    state.log.unshift(
      `${REALMS[actor].name}: «${region.name}», ${TOPICS[topic].name.toLowerCase()}, поддержка +${region.influence[actor] - before}, конкурирующая повестка −${counter}.`,
    );
  }
  if (action === "protect") {
    region.influence[actor] = Math.min(100, before + REALMS[actor].protection);
    region.factCheckShield[actor] = 1;
    region.fatigue = Math.max(0, region.fatigue - 10);
    nextTrust = Math.min(100, trust + trustRecovery(state, actor, region));
    state.log.unshift(
      `${REALMS[actor].name}: «${region.name}», проверка фактов и защита аудитории.`,
    );
  }
  if (actor === state.player) state.trust = nextTrust;
  else state.rivalTrust[actor] = nextTrust;
  region.infoController = regionController(region);
  const captured = previous !== actor && region.infoController === actor;
  if (captured)
    state.log.unshift(
      `В «${region.name}» теперь лидирует повестка ${REALMS[actor].name}.`,
    );
  trim(state);
  return { amount: region.influence[actor] - before, captured };
}
export function quickAction(
  current: QuickState,
  id: string,
  action: QuickAction,
): QuickState {
  const target = current.regions.find((r) => r.id === id);
  if (!target || actionError(current, target, action)) return current;
  const state = structuredClone(current),
    region = state.regions.find((r) => r.id === id)!;
  const protector = FACTION_IDS.find(
    (f) => f !== state.player && region.factCheckShield[f] > 0,
  );
  if (action === "attract" && protector) {
    state.influence -= actionCost(state, action);
    state.actions--;
    region.factCheckShield[protector] = 0;
    state.log.unshift(
      `«${region.name}»: кампания сдержана проверкой фактов соперника.`,
    );
    trim(state);
    return state;
  }
  apply(state, region, action, state.player, state.topic);
  state.actions += Math.max(0, decisionLimit(state) - decisionLimit(current));
  return state;
}
export type ActionEvent = {
  id: number;
  kind: QuickAction | "opponent" | "blocked" | "income";
  actor: FactionId;
  regionId?: string;
  amount: number;
  captured?: boolean;
  text: string;
  changes?: { regionId: string; actor: FactionId; amount: number }[];
};
export type TurnFrame = { state: QuickState; event: Omit<ActionEvent, "id"> };
function rivalDecision(
  state: QuickState,
  actor: FactionId,
  allowDefense = true,
  excluded = new Set<string>(),
): { region: Region; action: QuickAction; topic: TopicId } | null {
  const owned = state.regions.filter(
      (r) => r.infoController === actor && !excluded.has(r.id),
    ),
    trust = state.rivalTrust[actor];
  const defense = owned
    .filter(
      (r) =>
        r.influence[actor] - supportLead(r, actor) < 14 ||
        r.influence[actor] < 60,
    )
    .sort(
      (a, b) =>
        a.influence[actor] -
        supportLead(a, actor) -
        (b.influence[actor] - supportLead(b, actor)),
    )[0];
  if (
    state.difficulty !== "discovery" &&
    allowDefense &&
    defense &&
    !actionError(state, defense, "protect", actor)
  )
    return {
      region: defense,
      action: "protect",
      topic: CITY_TOPICS[state.regions.indexOf(defense)],
    };
  const center = owned
    .filter((r) => !r.mediaNodes[actor])
    .sort((a, b) => supportLead(a, actor) - supportLead(b, actor))[0];
  if (
    state.difficulty !== "discovery" &&
    state.turn <= 8 &&
    factionIncome(state, actor) < REALMS[actor].income + 2 &&
    center &&
    !actionError(state, center, "media", actor)
  )
    return { region: center, action: "media", topic: "development" };
  if (trust < 40 && owned[0] && !actionError(state, owned[0], "protect", actor))
    return { region: owned[0], action: "protect", topic: "stability" };
  const targets = state.regions
    .filter(
      (r) =>
        r.infoController !== actor &&
        !excluded.has(r.id) &&
        !actionError(state, r, "attract", actor),
    )
    .sort((a, b) => {
      const score = (r: Region) =>
        (r.politicalOwner === actor ? 15 : 0) +
        (r.infoController === state.player &&
        controlled(state) >= objective(state).goal - 1
          ? 12
          : 0) -
        supportNeeded(r, actor) -
        r.fatigue / 4 +
        (hash(state.seed + state.turn + r.id + actor) % 7);
      return score(b) - score(a);
    });
  const region = targets[0];
  if (region)
    return {
      region,
      action: "attract",
      topic: bestCampaignTopic(state, region, actor),
    };
  if (center && !actionError(state, center, "media", actor))
    return { region: center, action: "media", topic: "development" };
  return null;
}
export function rivalOutlook(state: QuickState, actor: FactionId) {
  const choice = rivalDecision(
    state,
    actor,
    state.turn % 2 === hash(actor) % 2,
  );
  return {
    actor,
    cities: state.regions.filter((r) => r.infoController === actor).length,
    centers: state.regions.filter(
      (r) => r.infoController === actor && r.mediaNodes[actor] > 0,
    ).length,
    target: choice?.region.name ?? null,
    intent:
      choice?.action === "media"
        ? "Расширяет сеть"
        : choice?.action === "protect"
          ? "Укрепляет доверие"
          : choice
            ? "Готовит кампанию"
            : "Копит ресурсы",
  };
}
export function planQuickEndTurn(current: QuickState): TurnFrame[] {
  if (current.result) return [];
  const state = structuredClone(current),
    frames: TurnFrame[] = [],
    mode = objective(state);
  for (const actor of FACTION_IDS.filter((f) => f !== state.player)) {
    const acted = new Set<string>();
    for (let n = 0; n < mode.aiActions; n++) {
      if (n === 0) state.regions.forEach((r) => (r.factCheckShield[actor] = 0));
      const choice = rivalDecision(
        state,
        actor,
        n === 0 && state.turn % 2 === hash(actor) % 2,
        acted,
      );
      if (!choice) {
        frames.push({
          state: structuredClone(state),
          event: {
            kind: "opponent",
            actor,
            amount: 0,
            text: "Редакции накапливают ресурсы",
          },
        });
        continue;
      }
      const { region, action, topic } = choice;
      acted.add(region.id);
      const protector = FACTION_IDS.find(
        (f) => f !== actor && region.factCheckShield[f] > 0,
      );
      if (action === "attract" && protector) {
        state.rivalBudget[actor] -= actionCost(state, action, actor);
        region.factCheckShield[protector] = 0;
        state.log.unshift(
          `«${region.name}»: проверка фактов сдержала кампанию ${REALMS[actor].name}.`,
        );
        frames.push({
          state: structuredClone(state),
          event: {
            kind: "blocked",
            actor,
            regionId: region.id,
            amount: 0,
            text: `«${region.name}»: аудитория защищена от этой кампании`,
          },
        });
        continue;
      }
      // Difficulty limits rival campaign strength; costs, trust and media income stay explicit.
      const result = apply(
        state,
        region,
        action,
        actor,
        topic,
        mode.aiGain +
          (state.difficulty === "discovery"
            ? 0
            : Math.floor(state.rivalTrust[actor] / 20)),
      );
      frames.push({
        state: structuredClone(state),
        event: {
          kind: action === "attract" ? "opponent" : action,
          actor,
          regionId: region.id,
          amount: result.amount,
          captured: result.captured,
          text: `«${region.name}»: ${action === "media" ? "редакция и новый охват" : action === "protect" ? "проверка фактов, доверие растёт" : `${TOPICS[topic].name.toLowerCase()}, поддержка +${result.amount}`}`,
        },
      });
    }
  }
  const income = turnIncome(state);
  state.influence += income;
  for (const actor of FACTION_IDS.filter((f) => f !== state.player))
    state.rivalBudget[actor] += factionIncome(state, actor);
  const changes: NonNullable<ActionEvent["changes"]> = [];
  for (const region of state.regions) {
    for (const actor of FACTION_IDS) {
      if (region.infoController === actor && region.mediaNodes[actor]) {
        const amount = Math.min(
          citySpecialty(state, region).support,
          100 - region.influence[actor],
        );
        region.influence[actor] += amount;
        if (amount) changes.push({ regionId: region.id, actor, amount });
      } else if (
        region.infoController !== actor &&
        !mediaReach(state, actor).has(state.regions.indexOf(region)) &&
        region.influence[actor] > 0
      ) {
        const amount = -Math.min(2, region.influence[actor]);
        region.influence[actor] += amount;
        if (actor === state.player)
          changes.push({ regionId: region.id, actor, amount });
      }
      if (actor === state.player) region.factCheckShield[actor] = 0;
    }
    region.fatigue = Math.max(0, region.fatigue - 4);
    region.infoController = regionController(region);
  }
  const qualifies = controlled(state) >= mode.goal && state.trust >= mode.trust;
  state.held = qualifies ? state.held + 1 : 0;
  if (state.held >= mode.hold) {
    state.result = "win";
    state.log.unshift(
      `Победа: информационное лидерство удержано ${state.held} ходов при доверии ${state.trust}%.`,
    );
  } else if (state.turn >= mode.limit) {
    state.result = "loss";
    state.log.unshift(
      "Время вышло: устойчивое информационное лидерство не достигнуто.",
    );
  } else state.turn++;
  state.actions = decisionLimit(state);
  state.log.unshift(
    `Медиасеть: +${income} ресурса. Удержание лидерства: ${state.held}/${mode.hold}.`,
  );
  trim(state);
  frames.push({
    state: structuredClone(state),
    event: {
      kind: "income",
      actor: state.player,
      amount: income,
      changes,
      text: `+${income} медиаресурса · ${state.held}/${mode.hold} ходов устойчивого лидерства · ${newsAt(state.turn).title}`,
    },
  });
  return frames;
}
export function quickEndTurn(current: QuickState): QuickState {
  return planQuickEndTurn(current).at(-1)?.state ?? current;
}
