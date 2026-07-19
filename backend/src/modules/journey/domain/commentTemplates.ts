import type { CurrencySnapshot as ConfigCurrency } from "../../../common/currency";
import { balanceToJourneyCurrencyValues, formatJourneyCurrencyValues, hasNegativeJourneyRewards } from "./currency";
import { MOVE_TYPES } from "./config";
import type {
  JourneyAchievement,
  JourneyCurrencyValue,
  JourneyMove,
  JourneyPlayer,
  RandomFn,
} from "./types";

type MoveTemplateType = Exclude<JourneyMove["type"], typeof MOVE_TYPES.ACHIEVEMENT>;

function randomFrom<T>(array: T[], randomFn: RandomFn = Math.random): T {
  const index = Math.floor(randomFn() * array.length);
  return array[index];
}

function interpolate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template);
}

function toAbsoluteRewards(values: JourneyCurrencyValue[]): JourneyCurrencyValue[] {
  return values.map((value) => ({
    currencyId: value.currencyId,
    value: Math.abs(value.value),
  }));
}

function formatRewardLabel(
  values: JourneyCurrencyValue[],
  currencies: ConfigCurrency[],
  options: {
    showPlus?: boolean;
    absolute?: boolean;
  } = {},
): string {
  const normalizedValues = options.absolute ? toAbsoluteRewards(values) : values;
  const label = formatJourneyCurrencyValues(normalizedValues, currencies, {
    showPlus: options.showPlus,
    includeZero: false,
  });

  return label || "0";
}

const moveTemplates: Record<MoveTemplateType, string[]> = {
  [MOVE_TYPES.EMPTY]: [
    "{nickname} осмотрелся, но ничего не нашёл [{balanceLabel}]",
    "{nickname} протёр уставшие глаза, но кроме паутины ничего не обнаружил [{balanceLabel}]",
    "На клетке подозрительно тихо. Для {nickname} тут сегодня пусто [{balanceLabel}]",
    "{nickname} заглянул в каждый угол, но нашёл только стены [{balanceLabel}]",
    "{nickname} ощутил лишь пустоту, даже шорохов не было слышно [{balanceLabel}]",
  ],
  [MOVE_TYPES.INCREASE]: [
    "{nickname} находит {rewardLabel} [{balanceLabel}]",
    "{nickname} нащупал тайник в стене и забрал {rewardLabel} [{balanceLabel}]",
    "Фея удачи приносит {nickname} ещё {rewardLabel} [{balanceLabel}]",
    "{nickname} открыл забытый сейф, а внутри лежали {rewardLabel} [{balanceLabel}]",
    "{nickname} случайно наткнулся на заначку: {rewardLabel} [{balanceLabel}]",
  ],
  [MOVE_TYPES.DECREASE]: [
    "{nickname} угодил в ловушку и потерял {rewardLabel} [{balanceLabel}]",
    "{nickname} попался разбойникам и расстался с {rewardLabel} [{balanceLabel}]",
    "Клетка вытянула из карманов {nickname} {rewardLabel} [{balanceLabel}]",
    "{nickname} споткнулся и вместе с равновесием потерял {rewardLabel} [{balanceLabel}]",
    "{nickname} обнаружил, что кошелёк стал легче на {rewardLabel} [{balanceLabel}]",
  ],
  [MOVE_TYPES.JACKPOT]: [
    "{nickname} срывает сокровище: {rewardLabel} [{balanceLabel}]",
    "{nickname} открывает сундук и забирает джекпот: {rewardLabel} [{balanceLabel}]",
    "{nickname} получает внезапное наследство: {rewardLabel} [{balanceLabel}]",
  ],
  [MOVE_TYPES.EMPTY_JACKPOT]: [
    "{nickname} находит сундук, но его уже кто-то опустошил [{balanceLabel}]",
    "{nickname} открывает сокровищницу, а внутри только пыль и записка от предшественника [{balanceLabel}]",
  ],
  [MOVE_TYPES.FINISH]: ["Игрок {nickname} покидает карту с добычей [{balanceLabel}]"],
  [MOVE_TYPES.AT_MAX]: [
    "{nickname} нашёл {requestedRewardLabel}, но лимит уже достигнут [{balanceLabel}]",
    "{nickname} пытался унести больше, но карманы уже переполнены [{balanceLabel}]",
    "{nickname} не смог забрать найденное сверх лимита [{balanceLabel}]",
  ],
  [MOVE_TYPES.TO_MAX]: [
    "{nickname} нашёл {requestedRewardLabel}, но получил только {rewardLabel} [{balanceLabel}]",
    "{nickname} упирается в лимит и забирает лишь часть находки: {rewardLabel} [{balanceLabel}]",
  ],
  [MOVE_TYPES.AT_ZERO]: [
    "Ловушка пыталась забрать у {nickname} {requestedRewardLabel}, но забирать уже нечего [{balanceLabel}]",
  ],
  [MOVE_TYPES.TO_ZERO]: [
    "{nickname} теряет только {rewardLabel} и упирается в ноль по части валют [{balanceLabel}]",
    "Коллекторы добрались до {nickname} и забрали всё возможное: {rewardLabel} [{balanceLabel}]",
  ],
};

const achievementTemplates = [
  'Игрок {nickname} получает достижение "{achievement}" за {description}. Награда: {rewardLabel} [{balanceLabel}]',
];

interface BuildJourneyCommentArgs {
  move?: JourneyMove;
  player: JourneyPlayer;
  achievement?: JourneyAchievement;
  currencies: ConfigCurrency[];
  appliedRewards?: JourneyCurrencyValue[];
  randomFn?: RandomFn;
}

export function buildJourneyComment({
  move,
  player,
  achievement,
  currencies,
  appliedRewards = [],
  randomFn = Math.random,
}: BuildJourneyCommentArgs): string {
  const balanceLabel = formatJourneyCurrencyValues(
    balanceToJourneyCurrencyValues(player.balance, currencies),
    currencies,
    {
      includeZero: false,
    },
  );

  if (move) {
    const templates =
      move.type === MOVE_TYPES.ACHIEVEMENT ? moveTemplates[MOVE_TYPES.EMPTY] : moveTemplates[move.type];
    const rewardValues = move.appliedRewards.length ? move.appliedRewards : move.requestedRewards;

    return interpolate(randomFrom(templates, randomFn), {
      nickname: player.nickname,
      rewardLabel: formatRewardLabel(rewardValues, currencies, {
        showPlus: !hasNegativeJourneyRewards(rewardValues),
        absolute: hasNegativeJourneyRewards(rewardValues),
      }),
      requestedRewardLabel: formatRewardLabel(move.requestedRewards, currencies, {
        showPlus: !hasNegativeJourneyRewards(move.requestedRewards),
        absolute: hasNegativeJourneyRewards(move.requestedRewards),
      }),
      balanceLabel,
    });
  }

  return interpolate(randomFrom(achievementTemplates, randomFn), {
    nickname: player.nickname,
    achievement: achievement?.title ?? achievement?.name ?? "",
    description: achievement?.description ?? "",
    rewardLabel: formatRewardLabel(appliedRewards.length ? appliedRewards : achievement?.rewards ?? [], currencies, {
      showPlus: true,
    }),
    balanceLabel,
  });
}
