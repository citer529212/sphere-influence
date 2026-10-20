export type EventOption = {
  id: string;
  title: string;
  text: string;
  resource: number;
  trust: number;
  support: number;
  fatigue: number;
};
export const WORLD_EVENTS = [
  {
    title: "Кризис доверия",
    text: "В городе спорят о противоречивых публикациях. Люди ждут ответа вашей редакции.",
    options: [
      {
        id: "verify",
        title: "Опубликовать проверку",
        text: "Выделить редакторов для открытого разбора фактов.",
        resource: -4,
        trust: 10,
        support: 8,
        fatigue: -8,
      },
      {
        id: "broadcast",
        title: "Объяснить свою позицию",
        text: "Быстро занять эфир. Охват вырастет, но часть людей сочтёт ответ поспешным.",
        resource: -3,
        trust: -7,
        support: 18,
        fatigue: 8,
      },
      {
        id: "listen",
        title: "Провести открытый разговор",
        text: "Ответить на вопросы общины без платной кампании. Эффект скромнее.",
        resource: 0,
        trust: 3,
        support: 4,
        fatigue: -4,
      },
    ],
  },
  {
    title: "Спор о торговом пути",
    text: "Новый торговый маршрут разделил жителей. Чьи объяснения окажутся убедительнее?",
    options: [
      {
        id: "verify",
        title: "Подготовить независимый разбор",
        text: "Оплатить исследование выгод и рисков.",
        resource: -4,
        trust: 8,
        support: 10,
        fatigue: -6,
      },
      {
        id: "broadcast",
        title: "Запустить большой эфир",
        text: "Привлечь внимание яркой кампанией о возможностях города.",
        resource: -3,
        trust: -6,
        support: 18,
        fatigue: 8,
      },
      {
        id: "listen",
        title: "Собрать предложения жителей",
        text: "Постепенно выстроить диалог без расходов на эфир.",
        resource: 0,
        trust: 3,
        support: 4,
        fatigue: -4,
      },
    ],
  },
  {
    title: "Документы без контекста",
    text: "В сеть попали фрагменты документов. Горожане пытаются понять, что они означают.",
    options: [
      {
        id: "verify",
        title: "Проверить и объяснить",
        text: "Дать ссылки на источники и отделить факты от предположений.",
        resource: -4,
        trust: 11,
        support: 7,
        fatigue: -8,
      },
      {
        id: "broadcast",
        title: "Выйти с быстрым комментарием",
        text: "Занять внимание до конкурентов, приняв риск потери доверия.",
        resource: -2,
        trust: -8,
        support: 17,
        fatigue: 10,
      },
      {
        id: "listen",
        title: "Открыть приём вопросов",
        text: "Выслушать людей, пока редакторы изучают материалы.",
        resource: 0,
        trust: 3,
        support: 4,
        fatigue: -4,
      },
    ],
  },
  {
    title: "Городской форум",
    text: "Общины приглашают редакции обсудить будущее города. Внимание людей ограничено.",
    options: [
      {
        id: "verify",
        title: "Пригласить экспертов",
        text: "Оплатить встречу с проверяемыми аргументами.",
        resource: -4,
        trust: 7,
        support: 11,
        fatigue: -6,
      },
      {
        id: "broadcast",
        title: "Стать главным голосом форума",
        text: "Провести масштабную трансляцию. Некоторым не понравится избыток вашей повестки.",
        resource: -3,
        trust: -5,
        support: 16,
        fatigue: 8,
      },
      {
        id: "listen",
        title: "Дать слово жителям",
        text: "Провести небольшой разговор без затрат.",
        resource: 0,
        trust: 3,
        support: 4,
        fatigue: -4,
      },
    ],
  },
] as const satisfies readonly {
  title: string;
  text: string;
  options: readonly EventOption[];
}[];
