import { FactionId } from "./types";
import { FACTION_IDS, REALMS } from "./realms";
import { CITY_TOPICS, CITY_ROLES, TopicId } from "./information";
import {
  QuickState,
  QuickAction,
  TurnFrame,
  createQuickGame,
  quickAction,
  actionError,
  mediaReach,
  regionController,
  pendingWorldEvent,
  resolveWorldEvent,
  setCampaignTopic,
  planQuickEndTurn,
  decisionLimit,
  objective,
} from "./quickGame";

export type Lesson = {
  id: string;
  title: string;
  group: string;
  explanation: string[];
  task: string;
  kind:
    | "select"
    | "topic"
    | "campaign"
    | "neutral"
    | "repeat"
    | "protect"
    | "shield"
    | "media"
    | "network"
    | "turn"
    | "specialty"
    | "event"
    | "third"
    | "victory"
    | "rival"
    | "quiz";
  quiz?: { question: string; answers: string[]; correct: number; why: string };
};
export const LESSONS: Lesson[] = [
  {
    id: "map",
    group: "Основы",
    title: "Карта и выбор города",
    kind: "select",
    explanation: [
      "Вы управляете информационным влиянием, а не армией. На карте 16 городов: три державы и независимые серые острова. Выбор города сам по себе не расходует решения.",
      "В основной игре нажимайте на город или переключайте его справа. WASD и стрелки двигают камеру, Shift ускоряет в 2,5 раза, колесо меняет масштаб. На телефоне: один палец — вращение, два — масштаб.",
      "В учебной карте ниже используются те же города и правила. Все изменения здесь учебные.",
    ],
    task: "Выберите любой другой город на учебной карте.",
  },
  {
    id: "opinion",
    group: "Основы",
    title: "Поддержка и лидерство",
    kind: "quiz",
    explanation: [
      "Поддержка — отдельный показатель каждой державы от 0 до 100. Три показателя не обязаны складываться в 100%.",
      "Для лидерства нужно опережать обе чужие повестки хотя бы на 5 очков. Если отрыв меньше — аудитория спорная. Политическая принадлежность города от кампании не меняется.",
      "В слое «Влияние» цвет земли показывает лидера, насыщенность — его отрыв. Пунктир у города означает отрыв меньше 15: это предупреждение, а не другой порог захвата. «Мнения» раскрывает все три показателя.",
    ],
    task: "Решите пример.",
    quiz: {
      question:
        "У вас 49 поддержки, у соперников 50 и 25. Сколько нужно иметь, если их поддержка не изменится?",
      answers: ["50", "55", "100"],
      correct: 1,
      why: "55 даёт требуемый отрыв 5 от сильнейшей повестки (50). Кампания также может снизить чужую поддержку, поэтому фактический захват иногда происходит раньше.",
    },
  },
  {
    id: "resources",
    group: "Основы",
    title: "Ресурс и решения",
    kind: "quiz",
    explanation: [
      "Медиаресурс оплачивает действия, а решения ограничивают их число за ход. Это два разных ограничения: большой запас ресурса не даёт бесконечных действий.",
      "Обычно у вас два решения. Стоимость указана у каждой кнопки, недоступное действие объясняет причину: ресурс, охват, лидерство, уже работающая редакция или обязательное событие.",
      "Можно действовать в одном городе или в разных. Неиспользованные решения не переносятся; ресурс переносится. Завершить ход разрешено и раньше.",
    ],
    task: "Проверьте понимание.",
    quiz: {
      question: "Ресурса достаточно, но решений осталось 0. Что делать?",
      answers: ["Выбрать другую тему", "Завершить ход", "Переключить город"],
      correct: 1,
      why: "Выбор темы и города не восстанавливает решения. Следующий ход выдаст новый лимит.",
    },
  },
  {
    id: "topics",
    group: "Кампании",
    title: "Тема и местная повестка",
    kind: "topic",
    explanation: [
      "Три темы — развитие, открытость и достоверность. Выбор темы бесплатный и не запускает кампанию.",
      "Совпадение с местной повесткой даёт +5 к поддержке кампании. Общий инфоповод тоже может дать бонус; он меняется по ходу партии.",
      "На кнопках тем виден расчёт прибавки для текущего города с учётом условий. Здесь найдите тему, совпадающую с местной повесткой.",
    ],
    task: "Выберите тему, совпадающую с местной повесткой выбранного города.",
  },
  {
    id: "campaign",
    group: "Кампании",
    title: "Первая кампания и смена лидера",
    kind: "campaign",
    explanation: [
      "Кампания повышает вашу поддержку и ослабляет сильнейшую чужую повестку. Но расходует ресурс, решение и доверие, а аудитория устаёт.",
      "В этом примере выбран домашний город, где лидерство перешло сопернику. Он всё ещё доступен через домашнюю сеть.",
      "После действия сравните поддержку всех сторон, доверие, ресурс и число решений. Основная партия останется прежней.",
    ],
    task: "Проведите кампанию и добейтесь лидерства в учебном городе.",
  },
  {
    id: "neutral",
    group: "Кампании",
    title: "Независимые острова",
    kind: "neutral",
    explanation: [
      "Серые острова — активные независимые аудитории. Их можно убедить, а затем открыть там редакции.",
      "Для нейтрального города недостаточно отрыва 5: вашей поддержке нужно достичь ещё и 55. До этого аудитория остаётся независимой.",
      "Здесь у вас 54 поддержки — почти достаточно, но лидерства ещё нет. Выбран остров в охвате сети.",
    ],
    task: "Проведите кампанию на выбранном острове и получите лидерство.",
  },
  {
    id: "fatigue",
    group: "Кампании",
    title: "Усталость и повтор темы",
    kind: "repeat",
    explanation: [
      "Частые кампании утомляют аудиторию, из-за чего последующие кампании слабее. Усталость относится к городу.",
      "Повтор одной и той же темы в том же городе дополнительно уменьшает эффект. Память повтора и усталость — разные механики.",
      "Меняйте тему, переключайтесь между городами, используйте проверку фактов. В конце хода усталость уменьшается на 4; проверка фактов снимает 10.",
    ],
    task: "Дважды проведите кампанию с одной темой в одном городе и сравните результаты.",
  },
  {
    id: "trust",
    group: "Защита",
    title: "Доверие и проверка фактов",
    kind: "protect",
    explanation: [
      "Доверие — общий показатель вашей державы. Агрессивные кампании снижают его, а для победы оно должно быть не ниже порога сложности.",
      "Проверка фактов возвращает доверие, даёт поддержку, уменьшает усталость и ставит защиту от одной чужой кампании.",
      "Точная прибавка доверия зависит от правителя, инфоповода и особенности города. В примере доверие низкое, а усталость высокая.",
    ],
    task: "Используйте проверку фактов и посмотрите изменения доверия, усталости и защиты.",
  },
  {
    id: "shield",
    group: "Защита",
    title: "Почему кампания может не сработать",
    kind: "shield",
    explanation: [
      "У соперника тоже бывает проверка фактов. Его щит блокирует одну вашу кампанию в этом городе.",
      "Заблокированная кампания всё равно расходует ресурс и решение, но не даёт обычного роста поддержки. Чужой щит после неё расходуется.",
      "Ваш щит действует против одной ответной кампании; оставшаяся защита снимается в конце хода. Показатели щита видны в карточке города.",
    ],
    task: "Проведите кампанию в городе с чужим щитом и сравните поддержку до и после.",
  },
  {
    id: "media",
    group: "Медиасеть",
    title: "Редакция: инвестиция в сеть",
    kind: "media",
    explanation: [
      "Редакция строится только в городе, где ваша повестка уже лидирует. Для каждой державы в городе она строится один раз, без уровней.",
      "Работающая редакция приносит доход, пассивно укрепляет поддержку и расширяет охват. При потере лидерства её доход и поддержка для вас прекращаются.",
      "Стоимость зависит от державы, а доход и пассивная поддержка — от типа города. В основной 3D-карте появятся башня и здания редакции.",
    ],
    task: "Постройте редакцию в выбранном городе и сравните доход.",
  },
  {
    id: "network",
    group: "Медиасеть",
    title: "Охват и связи между материками",
    kind: "network",
    explanation: [
      "Домашние города доступны через домашнюю сеть. Поддерживающий вас город открывает соседние аудитории по связям.",
      "Работающая редакция в таком городе расширяет охват ещё на одну связь. Вне охвата проводить действия нельзя, даже если есть ресурс.",
      "В основной карте кнопка «Сеть» показывает линии. Здесь включите связи и постройте редакцию: новые доступные города подсветятся. Влияние без охвата может убывать по 2 за ход, если вы там не лидер.",
    ],
    task: "Включите связи и постройте редакцию в выделенном городе.",
  },
  {
    id: "turn",
    group: "Ходы",
    title: "Ответы соперников и доход",
    kind: "turn",
    explanation: [
      "После завершения хода соперники по очереди выбирают кампании, редакции или защиту. Они тоже тратят ресурсы и доверие.",
      "Затем начисляется доход, работающие редакции укрепляют аудитории, уменьшается усталость и проверяются условия победы.",
      "В игре это анимация; пропуск доводит её до того же конечного состояния. Здесь разберите ответы кнопкой «Следующее действие», чтобы увидеть каждый результат.",
    ],
    task: "Завершите учебный ход и просмотрите все действия до начисления дохода.",
  },
  {
    id: "specialty",
    group: "Особенности",
    title: "Типы городов",
    kind: "specialty",
    explanation: [
      "Гражданские центры, торговые узлы, университеты и независимые редакции имеют разные особенности.",
      "Торговый узел выгоден для дохода; университет помогает восстанавливать доверие; независимая редакция быстрее укрепляет поддержку. Точные значения указаны у города.",
      "Не все города одинаково выгодны для следующей инвестиции. Выбирайте их под задачу и сеть, а не только по близости.",
    ],
    task: "Найдите и выберите университетский город.",
  },
  {
    id: "climate",
    group: "Особенности",
    title: "Климат, сезоны и освещение",
    kind: "quiz",
    explanation: [
      "Климат и сезон дают поправки к кампаниям. Весна помогает, полярная зима, засушливое лето и тропическая осень осложняют работу.",
      "Поправка показана в карточке и уже включена в прогноз кампании. Сезон меняется каждые два хода.",
      "Смена дня и ночи — только освещение. Она не расходует ходы, не меняет доход и не влияет на поддержку. Кнопка «День» фиксирует свет.",
    ],
    task: "Отделите правило игры от визуального эффекта.",
    quiz: {
      question: "Что влияет на расчёт кампании?",
      answers: ["Ночь на карте", "Сезон и климат города", "Масштаб камеры"],
      correct: 1,
      why: "Климатическая поправка участвует в расчёте; время суток и положение камеры — нет.",
    },
  },
  {
    id: "events",
    group: "События",
    title: "События и выбор последствий",
    kind: "event",
    explanation: [
      "Каждый четвёртый ход появляется событие с тремя ответами. Сначала нужно выбрать ответ, затем можно проводить обычные действия.",
      "Выбор события не расходует решения, но может менять ресурс, доверие, поддержку и усталость. Ответ с расходом недоступен без нужного ресурса.",
      "Числа показаны до выбора. Поддержка меняется в указанном городе; доверие и ресурс относятся к державе. Ответ нельзя повторять после перезагрузки.",
    ],
    task: "Выберите один из ответов и сравните фактические последствия.",
  },
  {
    id: "third",
    group: "Развитие",
    title: "Третье решение",
    kind: "third",
    explanation: [
      "В стандартной и экспертной сложности с 9-го хода три контролируемые работающие редакции открывают третье решение. В «Знакомстве» лимит остаётся равным двум.",
      "Недостаточно просто иметь три построенные башни: в этих городах должна лидировать ваша повестка. Потеря лидерства лишает сеть соответствующих преимуществ.",
      "В примере уже 9-й ход и две работающие редакции. Постройте третью: лимит увеличится в этом же ходе.",
    ],
    task: "Постройте третью работающую редакцию и откройте лимит 3 решения.",
  },
  {
    id: "rulers",
    group: "Стратегия",
    title: "Правители и особенности держав",
    kind: "quiz",
    explanation: [
      "Атлас дешевле строит редакции, но его кампании сильнее утомляют аудиторию.",
      "Меридиан получает больше поддержки от проверки фактов, но его обычные кампании слабее.",
      "Конкорданс имеет больший базовый доход и лучше восстанавливает доверие, однако кампании отнимают больше доверия. Выбор правителя меняет стратегию, а не только цвет.",
    ],
    task: "Выберите верную особенность.",
    quiz: {
      question:
        "Кому особенно выгодна проверка фактов для прямого роста поддержки?",
      answers: ["Меридиану", "Всем одинаково", "Нейтральным островам"],
      correct: 0,
      why: "Проверка Меридиана даёт 15 поддержки вместо обычных 10. Точные параметры держав доступны перед игрой.",
    },
  },
  {
    id: "difficulty",
    group: "Стратегия",
    title: "Сложности и темп партии",
    kind: "quiz",
    explanation: [
      "«Знакомство»: 8 городов, доверие 35%, удержание 1 ход, лимит 18. Соперники не побеждают по гонке.",
      "Стандарт: 10 городов, доверие 45%, удержание 2 хода, лимит 24. Соперникам достаточно 7 городов.",
      "Эксперт: 11 городов, доверие 50%, удержание 2 хода, лимит 30. Каждый соперник делает два решения; его цель — 8 городов. Сохранения сложностей раздельны.",
    ],
    task: "Проверьте понимание экспертного режима.",
    quiz: {
      question:
        "Сколько решений за ответный ход у каждого соперника на эксперте?",
      answers: ["Одно", "Два", "Столько же, сколько у вас"],
      correct: 1,
      why: "У каждого соперника два решения. Ваше третье решение зависит от развития сети.",
    },
  },
  {
    id: "victory",
    group: "Победа",
    title: "Лидерство нужно удержать",
    kind: "victory",
    explanation: [
      "Победа требует одновременно достаточного числа городов и доверия. Затем это состояние нужно удержать заданное число полных ходов.",
      "Проверка идёт после ответов соперников. Если условий больше нет, удержание сбрасывается. Простое достижение числа городов во время вашей кампании ещё не завершает партию.",
      "В учебном примере цель уже достигнута и удержана один ход. Проведите ещё один полный ход и дождитесь проверки.",
    ],
    task: "Завершите ход и получите учебную победу.",
  },
  {
    id: "rivals",
    group: "Победа",
    title: "Соперник тоже может победить",
    kind: "rival",
    explanation: [
      "В стандартной и экспертной сложности соперники тоже должны удержать свою цель два хода с достаточным доверием.",
      "Предупреждение показывает города и удержание соперника. Снижайте его поддержку и сбивайте лидерство до завершения второго хода.",
      "Если оба соперника одновременно удержали цель, сравниваются число городов и доверие. При полном равенстве соперников гонка продолжается. Ваша выполненная цель проверяется первой.",
      "Здесь специально подготовлена опасная ситуация. Просмотрите ход: вы увидите, почему игра может закончиться раньше общего лимита. Эта учебная неудача не записывается в основную партию.",
    ],
    task: "Просмотрите полный ход и изучите победу соперника.",
  },
  {
    id: "sharing",
    group: "Вне партии",
    title: "Сохранения и вызовы",
    kind: "quiz",
    explanation: [
      "Основная партия автоматически сохраняется на устройстве между завершёнными действиями. Переход сложности использует отдельное сохранение; новая попытка заменяет прежнюю попытку на этой карте.",
      "Вызов другу передаёт код карты, правителя, сложность и версию правил. Эти условия нужны для сравнения результатов. Кнопка «Вызов» не отправляет сообщения сама.",
      "Карточка результата показывает исход и статистику. Автономный HTML работает без сети; хранение браузера может быть недоступно — тогда игра предупреждает, а обучение продолжает работать без сохранения прогресса.",
    ],
    task: "Выберите корректное сравнение.",
    quiz: {
      question: "Какие результаты честно сравнивать?",
      answers: [
        "На любых картах",
        "На одной карте, с одним правителем, сложностью и версией правил",
        "Только с одинаковым цветом",
      ],
      correct: 1,
      why: "Одинаковые условия важны для сопоставимого вызова.",
    },
  },
  {
    id: "finish",
    group: "Итог",
    title: "Ваш первый план партии",
    kind: "quiz",
    explanation: [
      "Сначала укрепите домашнюю сеть и выберите полезные редакции. Затем продвигайтесь по связям к новым аудиториям и нейтральным островам.",
      "Сопоставляйте тему с повесткой, следите за усталостью и чередуйте кампании с проверкой фактов. Держите запас доверия перед гонкой за победу.",
      "Проверяйте угрозы соперников перед завершением хода. Все разделы школы доступны повторно; учебные результаты не попадают в основную партию или вызов.",
    ],
    task: "Последний вопрос.",
    quiz: {
      question: "Что необходимо для победы?",
      answers: [
        "Достаточно построить три редакции",
        "Города, доверие и полное удержание цели после ответов соперников",
        "Только высокий ресурс",
      ],
      correct: 1,
      why: "Работающая сеть помогает, но победа проверяет одновременно охват аудиториями, доверие и удержание.",
    },
  },
];

export type Practice = {
  game: QuickState;
  selected: string;
  initial: string;
  network: boolean;
  actions: QuickAction[];
  frames: TurnFrame[];
  frame: number;
  finishedTurn: boolean;
  selectedOther: boolean;
  topicChosen: boolean;
  eventChosen: boolean;
  feedback: string;
};
export function createPractice(id: string, player: FactionId): Practice {
  const game = createQuickGame("school-v1-" + id, player, "standard");
  game.influence = 50;
  game.trust = 60;
  game.actions = 2;
  for (const r of game.regions) {
    r.mediaNodes[player] = 0;
    r.factCheckShield[player] = 0;
  }
  const home = game.regions
    .map((r, i) => (r.politicalOwner === player ? i : -1))
    .filter((i) => i >= 0);
  let focus = home[0];
  const rival = FACTION_IDS.find((f) => f !== player)!;
  if (id === "campaign") {
    game.regions[focus].influence = { atlas: 10, meridian: 10, concordat: 10 };
    game.regions[focus].influence[player] = 40;
    game.regions[focus].influence[rival] = 42;
  }
  if (id === "neutral") {
    focus = game.regions.findIndex(
      (r, i) => r.politicalOwner === "neutral" && mediaReach(game).has(i),
    );
    game.regions[focus].influence = { atlas: 20, meridian: 20, concordat: 20 };
    game.regions[focus].influence[player] = 54;
  }
  if (id === "shield") game.regions[focus].factCheckShield[rival] = 1;
  if (id === "trust") {
    game.trust = 28;
    game.regions[focus].fatigue = 50;
  }
  if (id === "network")
    focus = home.reduce((best, i) => {
      const a = quickAction(game, game.regions[i].id, "media"),
        b = quickAction(game, game.regions[best].id, "media");
      return mediaReach(a).size > mediaReach(b).size ? i : best;
    }, home[0]);
  if (id === "turn") game.regions[focus].mediaNodes[player] = 1;
  if (id === "events") {
    game.turn = 4;
    game.eventTurn = 0;
    focus = game.regions.findIndex(
      (r) => r.id === pendingWorldEvent(game)?.region.id,
    );
  }
  if (id === "third") {
    game.turn = 9;
    game.eventTurn = 8;
    game.regions[home[0]].mediaNodes[player] = 1;
    game.regions[home[1]].mediaNodes[player] = 1;
    focus = home[2];
  }
  if (id === "victory") {
    game.turn = 5;
    game.eventTurn = 4;
    game.held = 1;
    for (const r of game.regions.slice(0, objective(game).goal)) {
      r.influence = { atlas: 0, meridian: 0, concordat: 0 };
      r.influence[player] = 100;
    }
  }
  if (id === "rivals") {
    game.turn = 5;
    game.eventTurn = 4;
    game.rivalHeld[rival] = 1;
    game.rivalTrust[rival] = 80;
    for (const r of game.regions.slice(0, 8)) {
      r.influence = { atlas: 0, meridian: 0, concordat: 0 };
      r.influence[rival] = 100;
    }
  }
  for (const r of game.regions) r.infoController = regionController(r);
  const selected = game.regions[focus].id;
  return {
    game,
    selected,
    initial: selected,
    network: false,
    actions: [],
    frames: [],
    frame: 0,
    finishedTurn: false,
    selectedOther: false,
    topicChosen: false,
    eventChosen: false,
    feedback:
      "Учебный пример подготовлен. Ресурсы основной партии не расходуются.",
  };
}
export type PracticeEvent =
  | { type: "select"; id: string }
  | { type: "topic"; topic: TopicId }
  | { type: "action"; action: QuickAction }
  | { type: "network" }
  | { type: "turn" }
  | { type: "frame" }
  | { type: "event"; id: string };
export function practiceStep(
  current: Practice,
  event: PracticeEvent,
): Practice {
  const s = { ...current },
    before = s.game,
    region = before.regions.find((r) => r.id === s.selected)!;
  if (s.frames.length && event.type !== "frame") return current;
  if (event.type === "select") {
    if (!before.regions.some((r) => r.id === event.id)) return current;
    s.selected = event.id;
    s.selectedOther = event.id !== s.initial;
    return s;
  }
  if (event.type === "network") {
    s.network = !s.network;
    return s;
  }
  if (event.type === "topic") {
    s.game = setCampaignTopic(before, event.topic);
    s.topicChosen = true;
    s.feedback = "Тема выбрана бесплатно. Решения и ресурс не изменились.";
    return s;
  }
  if (event.type === "event") {
    s.game = resolveWorldEvent(before, event.id);
    if (s.game === before) return current;
    s.eventChosen = true;
    s.feedback = `Ответ принят. Ресурс ${s.game.influence - before.influence >= 0 ? "+" : ""}${s.game.influence - before.influence}, доверие ${s.game.trust - before.trust >= 0 ? "+" : ""}${s.game.trust - before.trust}. Решения: ${s.game.actions}.`;
    return s;
  }
  if (event.type === "action") {
    const error = actionError(before, region, event.action);
    if (error) return { ...s, feedback: error };
    s.game = quickAction(before, s.selected, event.action);
    s.actions = [...s.actions, event.action];
    const after = s.game.regions.find((r) => r.id === s.selected)!;
    s.feedback = `Поддержка ${region.influence[before.player]} → ${after.influence[before.player]}; доверие ${before.trust} → ${s.game.trust}; ресурс ${before.influence} → ${s.game.influence}; решения ${before.actions} → ${s.game.actions}; усталость ${region.fatigue} → ${after.fatigue}. ${s.game.log[0]}`;
    return s;
  }
  if (event.type === "turn") {
    if (pendingWorldEvent(before) || before.result) return current;
    s.frames = planQuickEndTurn(before);
    s.frame = 0;
    s.finishedTurn = false;
    s.feedback =
      "Ход подготовлен. Нажимайте «Следующее действие», чтобы разобрать каждый ответ.";
    return s;
  }
  if (event.type === "frame") {
    const frame = s.frames[s.frame];
    if (!frame) return current;
    s.game = frame.state;
    s.feedback = `${REALMS[frame.event.actor].name}: ${frame.event.text}`;
    if (s.frame === s.frames.length - 1) {
      s.frames = [];
      s.frame = 0;
      s.finishedTurn = true;
    } else s.frame++;
    return s;
  }
  return current;
}
export function practiceComplete(lesson: Lesson, s: Practice): boolean {
  const r = s.game.regions.find((r) => r.id === s.selected)!,
    player = s.game.player;
  switch (lesson.kind) {
    case "select":
      return s.selectedOther;
    case "topic":
      return (
        s.topicChosen && s.game.topic === CITY_TOPICS[s.game.regions.indexOf(r)]
      );
    case "campaign":
    case "neutral":
      return (
        s.actions.includes("attract") &&
        r.infoController === player &&
        r.id === s.initial
      );
    case "repeat":
      return (
        s.actions.filter((a) => a === "attract").length >= 2 &&
        Object.values(s.game.campaigns).some((c) => c.repeats >= 2)
      );
    case "protect":
      return (
        s.actions.includes("protect") &&
        s.game.trust > 28 &&
        r.factCheckShield[player] > 0
      );
    case "shield":
      return (
        s.actions.includes("attract") &&
        s.game.regions.find((r) => r.id === s.initial)!.factCheckShield[
          FACTION_IDS.find((f) => f !== player)!
        ] === 0
      );
    case "media":
      return s.actions.includes("media");
    case "network":
      return s.network && s.actions.includes("media");
    case "turn":
      return s.finishedTurn;
    case "specialty":
      return CITY_ROLES[s.game.regions.indexOf(r)] === "university";
    case "event":
      return s.eventChosen;
    case "third":
      return s.actions.includes("media") && decisionLimit(s.game) === 3;
    case "victory":
      return s.finishedTurn && s.game.result === "win";
    case "rival":
      return (
        s.finishedTurn && s.game.result === "loss" && s.game.winner !== player
      );
    default:
      return false;
  }
}
export type LearningProgress = { index: number; completed: string[] };
export const LEARNING_KEY = "spheres.learning.v1";
type Store = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};
export function loadLearning(store: Store | null): LearningProgress {
  try {
    const p = JSON.parse(store?.getItem(LEARNING_KEY) ?? "null");
    if (
      p?.version === 1 &&
      Number.isInteger(p.index) &&
      p.index >= 0 &&
      p.index < LESSONS.length &&
      Array.isArray(p.completed)
    )
      return {
        index: p.index,
        completed: [
          ...new Set<string>(
            p.completed.filter(
              (id: unknown) =>
                typeof id === "string" && LESSONS.some((l) => l.id === id),
            ),
          ),
        ],
      };
  } catch {}
  return { index: 0, completed: [] };
}
export function saveLearning(
  store: Store | null,
  p: LearningProgress,
): boolean {
  try {
    if (!store) return false;
    store.setItem(LEARNING_KEY, JSON.stringify({ version: 1, ...p }));
    return true;
  } catch {
    return false;
  }
}
