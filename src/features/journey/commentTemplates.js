import { JOURNEY_ACHIEVEMENTS, JOURNEY_CONFIG, MOVE_TYPES } from "./config";

function randomFrom(array, randomFn = Math.random) {
  const index = Math.floor(randomFn() * array.length);
  return array[index];
}

function interpolate(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template);
}

const moveTemplates = {
  [MOVE_TYPES.EMPTY]: [
    "{nickname} осмотрелся, но ничего не нашёл [{fullPrize} {currency}]",
    "{nickname} протёр уставшие глаза, но кроме паутины ничего не обнаружил [{fullPrize} {currency}]",
    "На клетке подозрительно тихо. Для {nickname} тут сегодня пусто [{fullPrize} {currency}]",
    "{nickname} заглянул в каждый угол, но нашёл только стены [{fullPrize} {currency}]",
    "{nickname} ощутил лишь пустоту — даже шорохов не было слышно [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.INCREASE]: [
    "{nickname} нашёл чек на {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} нащупал тайник в стене и вытащил {bonus} {currency} [{fullPrize} {currency}]",
    "Фея удачи приносит {nickname} ещё {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} открыл забытый сейф, а внутри лежали {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} случайно нашёл заначку на {bonus} {currency} [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.DECREASE]: [
    "{nickname} угодил в ловушку и потерял {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} попался разбойникам и расстался с {bonus} {currency} [{fullPrize} {currency}]",
    "Клетка вытянула из карманов {nickname} ещё {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} споткнулся, и вместе с равновесием потерял {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} обнаружил, что кошелёк стал легче на {bonus} {currency} [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.JACKPOT]: [
    "{nickname} срывает сокровище на {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} открывает сундук и забирает джекпот: {bonus} {currency} [{fullPrize} {currency}]",
    "{nickname} получает внезапное наследство на {bonus} {currency} [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.EMPTY_JACKPOT]: [
    "{nickname} находит сундук, но его уже кто-то опустошил [{fullPrize} {currency}]",
    "{nickname} открывает сокровищницу, а внутри только пыль и записка от предшественника [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.FINISH]: ["Игрок {nickname} покидает карту с добычей [{fullPrize} {currency}]"],
  [MOVE_TYPES.AT_MAX]: [
    "{nickname} пытался унести больше, но карманы уже переполнены [{fullPrize} {currency}]",
    "{nickname} нашёл ещё награду, но лимит уже достигнут [{fullPrize} {currency}]",
    "{nickname} не смог унести найденное сверх лимита [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.TO_MAX]: [
    "{nickname} нашёл {bonus} {currency}, но унести смог только {difference} {currency} [{fullPrize} {currency}]",
    "{nickname} упирается в лимит и забирает лишь часть находки: {difference} {currency} [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.AT_ZERO]: [
    "Разбойники хотели отнять у {nickname} {bonus} {currency}, но карманы уже пусты [{fullPrize} {currency}]",
  ],
  [MOVE_TYPES.TO_ZERO]: [
    "{nickname} лишается последних {differenceAbs} {currency} и остаётся без фишек [{fullPrize} {currency}]",
    "Коллекторы добираются до {nickname} и забирают всё до нуля [{fullPrize} {currency}]",
  ],
};

const achievementTemplates = [
  'Игрок {nickname} получает достижение "{achievement}" за {description}. Награда: {bonus} {currency} [{fullPrize} {currency}]',
];

export function buildJourneyComment({ move, player, achievement, randomFn = Math.random }) {
  if (move) {
    const templates = moveTemplates[move.type] ?? moveTemplates[MOVE_TYPES.EMPTY];
    return interpolate(randomFrom(templates, randomFn), {
      nickname: player.nickname,
      bonus: Math.abs(move.cell?.isJackpot ? JOURNEY_CONFIG.jackpotPrize : move.cell?.prize ?? 0),
      difference: move.prize - move.previousPrize,
      differenceAbs: Math.abs(move.prize - move.previousPrize),
      fullPrize: player.prize + player.bonuses.reduce((sum, bonus) => sum + bonus.prize, 0),
      currency: JOURNEY_CONFIG.currency,
    });
  }

  const achievementMeta =
    achievement && Object.values(JOURNEY_ACHIEVEMENTS).find((item) => item.name === achievement.name);

  return interpolate(randomFrom(achievementTemplates, randomFn), {
    nickname: player.nickname,
    achievement: achievementMeta?.title ?? achievement?.name ?? "",
    description: achievementMeta?.description ?? "",
    bonus: achievementMeta?.prize ?? achievement?.prize ?? 0,
    fullPrize: player.prize + player.bonuses.reduce((sum, bonus) => sum + bonus.prize, 0),
    currency: JOURNEY_CONFIG.currency,
  });
}

