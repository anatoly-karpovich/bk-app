import type { CurrencySnapshot as ConfigCurrency } from "../../../common/currency";
import { formatJourneyCurrencyValues, hasNegativeJourneyRewards } from "./currency";
import { MOVE_TYPES } from "./config";
import type {
  JourneyAchievement,
  JourneyCurrencyValue,
  JourneyMoveType,
  RandomFn,
} from "./types";

type MoveTemplateType = Exclude<JourneyMoveType, typeof MOVE_TYPES.ACHIEVEMENT>;

export type JourneyForumCommentEvent =
  | {
      kind: "move";
      playerNickname: string;
      moveType: JourneyMoveType;
      requestedRewards: JourneyCurrencyValue[];
      appliedRewards: JourneyCurrencyValue[];
      balanceAfter: JourneyCurrencyValue[];
    }
  | {
      kind: "achievement";
      playerNickname: string;
      achievement: JourneyAchievement;
      appliedRewards: JourneyCurrencyValue[];
      balanceAfter: JourneyCurrencyValue[];
    };

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
    "{nickname} осмотрелся(-ась), но ничего не нашёл(-ла) [{balanceLabel}]",
    "{nickname} протёр(-ла) уставшие глаза, присмотрелся(-ась) и кроме паутины ничего не нашёл(-ла) [{balanceLabel}]",
    "Надпись на стене: Машка — ВЦ! Помимо этого никаких находок для {nickname}, разумеется, не нашлось. [{balanceLabel}]",
    "Раздался леденящий душу рык! А нет, просто у {nickname} заурчало в животе. Денег на клетке тоже нет [{balanceLabel}]",
    "Так тихо на клетке — хорошо хоть {nickname} может постоять тут бесплатно. [{balanceLabel}]",
    "{nickname} осмотрелся(-ась), но ничего не нашёл(-ла) [{balanceLabel}]",
    "{nickname} протёр(-ла) уставшие глаза, но кроме паутины ничего не обнаружил(-ла) [{balanceLabel}]",
    "На клетке подозрительно тихо. Для {nickname} тут сегодня пусто [{balanceLabel}]",
    "{nickname} заглянул(-а) в каждый угол, но нашёл(-ла) только стены [{balanceLabel}]",
    "{nickname} ощутил(-а) лишь пустоту, даже шорохов не было слышно [{balanceLabel}]",
    "Под ногой у {nickname} заскрежетали камешки. Ничего особенного не обнаружено [{balanceLabel}].",
    "Тишина означает одно — ничего не получишь, {nickname}! [{balanceLabel}].",
    "{nickname} осмотрел(-а) каждый угол, но не увидел(-а) ничего, кроме стен [{balanceLabel}]",
    "Следы обещали что-то интересное, но не для {nickname} [{balanceLabel}].",
    "Клетка выглядела подозрительно пустой. {nickname} ничего не обнаружил(-а) [{balanceLabel}].",
    "{nickname} запрыгнул(-а) на клетку, но ни сокровищ, ни ответов не нашёл(-ла) [{balanceLabel}].",
    "На клетке нашлась старинная лампа! {nickname} потёр(-ла) её, но ничего не случилось... Лампочка накаливания же... [{balanceLabel}]",
    "{nickname} решил(-а) почесать ВЦ. И руки в тепле, и платить не надо! [{balanceLabel}]",
  ],
  [MOVE_TYPES.INCREASE]: [
    "{nickname} находит {rewardLabel} [{balanceLabel}]",
    "{nickname} нащупал(-а) тайник в стене и забрал(-а) {rewardLabel} [{balanceLabel}]",
    "Фея удачи приносит {nickname} ещё {rewardLabel} [{balanceLabel}]",
    "{nickname} открыл(-а) забытый сейф, а внутри лежали {rewardLabel} [{balanceLabel}]",
    "{nickname} случайно наткнулся(-ась) на заначку: {rewardLabel} [{balanceLabel}]",
    "{nickname} наткнулся(-ась) на скелет путника и нашёл(-ла) в его руке чек на {rewardLabel} [{balanceLabel}].",
    "{nickname} летел(-а) без оглядки, пробил(-а) головой стену и обнаружил(-а) в ней чек на {rewardLabel} [{balanceLabel}].",
    "{nickname} нащупал(-а) в стене гнездо пауков. Когда те разбежались, заметил(-а) чек на {rewardLabel} [{balanceLabel}].",
    "— Акцио бонусы! — прокричал(-а) {nickname}, и впервые в жизни это сработало: {rewardLabel} [{balanceLabel}].",
    "{nickname} нашёл(-ла) забытый сейф, в котором при открытии нашлось {rewardLabel} [{balanceLabel}].",
    "Случайный подарок от Феи Удачи принёс {nickname} {rewardLabel} [{balanceLabel}].",
    "{nickname} решился(-лась) поцеловать спящую красавицу за {rewardLabel}. Красавица была уже холодной... [{balanceLabel}].",
    "Пройдя танцевальный баттл против команды Катакомб, {nickname} заработал(-а) {rewardLabel} [{balanceLabel}].",
    "Став экспертом по анекдотам, {nickname} получил(-а) {rewardLabel} за самый смешной анекдот [{balanceLabel}].",
    "{nickname} победил(-а) в конкурсе на самый смешной костюм и получил(-а) {rewardLabel} как приз [{balanceLabel}].",
    "За победу над Сторожевой Грибоножкой в «Камень-ножницы-бумага» {nickname} получает {rewardLabel} [{balanceLabel}].",
    "{nickname} решил(-а) отдохнуть в брошенном спальном мешке, а в нём была заначка: {rewardLabel} [{balanceLabel}].",
  ],
  [MOVE_TYPES.DECREASE]: [
    "{nickname} угодил(-а) в ловушку и потерял(-а) {rewardLabel} [{balanceLabel}]",
    "{nickname} попался(-ась) разбойникам и расстался(-ась) с {rewardLabel} [{balanceLabel}]",
    "Клетка вытянула из карманов {nickname} {rewardLabel} [{balanceLabel}]",
    "{nickname} споткнулся(-ась) и вместе с равновесием потерял(-а) {rewardLabel} [{balanceLabel}]",
    "{nickname} обнаружил(-а), что кошелёк стал легче на {rewardLabel} [{balanceLabel}]",
    "Дарьяна Корт вытянула из карманов {nickname} {rewardLabel} [{balanceLabel}]",
    "{nickname} зашёл(-ла) в ремонт и вышел(-ла) без {rewardLabel} [{balanceLabel}]",
    "{nickname} купил(-а) свиток. Не тот. Потрачено {rewardLabel} [{balanceLabel}]",
    "Пытаясь открыть сундук, {nickname} случайно оплатил(-а) чужой кредит на {rewardLabel} [{balanceLabel}]",
    "Карман {nickname} оказался с дыркой. {rewardLabel} нашли свободу раньше хозяина [{balanceLabel}]",
    "На клетке работал очень убедительный мошенник. {nickname} лишился(-ась) {rewardLabel} [{balanceLabel}]",
    "{nickname} проиграл(-а) спор голубю и выплатил(-а) ему {rewardLabel} [{balanceLabel}]",
    "Налоговая тоже играет в БК. С {nickname} взыскано {rewardLabel} [{balanceLabel}]",
    "Сделав неосторожный шаг, {nickname} наступил(-а) на ядовитую змею. На противоядие ушло {rewardLabel} [{balanceLabel}].",
    "{nickname} нашёл(-ла) ящик вина и напился(-лась) до чертиков. На оплату вытрезвителя ушло {rewardLabel} [{balanceLabel}].",
    "{nickname} угодил(-а) в капкан. Скорая помощь стоила {rewardLabel} [{balanceLabel}].",
    "За превышение скорости передвижения по клеткам {nickname} оштрафован(-а) на {rewardLabel} сотрудниками ГАИ [{balanceLabel}].",
    "Клетка поглотила {rewardLabel} из карманов {nickname}, как чёрная дыра [{balanceLabel}].",
    "Запыхавшись, {nickname} закурил(-а) в общественном месте и тут же получил(-а) штраф {rewardLabel} [{balanceLabel}].",
    "Считая деньги в кошельке, {nickname} понял(-а), что потерял(-а) {rewardLabel} [{balanceLabel}].",
    "Сунув руку в карман, {nickname} нашёл(-ла) лишь дырку и осознал(-а), что потерял(-а) {rewardLabel} [{balanceLabel}].",
    "Споткнувшись о порог, {nickname} выронил(-а) {rewardLabel}, и оно укатилось в щель [{balanceLabel}].",
    "{nickname} потерял(-а) {rewardLabel}. Кажется, это была скрытая комиссия [{balanceLabel}].",
    "{nickname} узнал(-а), что получает наследство. В наследство достался долг в {rewardLabel} [{balanceLabel}].",
    "{nickname} нашёл(-ла) магический артефакт, который оказался проклят — шаману пришлось заплатить {rewardLabel} [{balanceLabel}].",
    "{nickname} узнал(-а), что Эми Тейли подала в суд на алименты. Пришлось заплатить {rewardLabel} [{balanceLabel}].",
  ],
  [MOVE_TYPES.JACKPOT]: [
    "{nickname} срывает сокровище: {rewardLabel} [{balanceLabel}]",
    "{nickname} открывает сундук и забирает джекпот: {rewardLabel} [{balanceLabel}]",
    "{nickname} получает внезапное наследство: {rewardLabel} [{balanceLabel}]",
    "{nickname} получил(-а) СМС о наследстве от пробабушки из Швейцарии: {rewardLabel} [{balanceLabel}].",
    "{nickname} сорвал(-а) джекпот в лотерее и получил(-а) {rewardLabel} [{balanceLabel}].",
    "Как не вовремя {nickname} приспичило в туалет... В поисках бумажки чуть не воспользовался(-ась) чеком на {rewardLabel} [{balanceLabel}].",
  ],
  [MOVE_TYPES.EMPTY_JACKPOT]: [
    "{nickname} находит сундук, но его уже кто-то опустошил [{balanceLabel}]",
    "{nickname} открывает сокровищницу, а внутри только пыль и записка от предшественника [{balanceLabel}]",
    "{nickname} обнаружил(-а) огромный сундук с сокровищами, но кто-то обчистил его раньше... [{balanceLabel}].",
    "Когда {nickname} открыл(-а) сундук, внутри нашлись лишь куча пыли и записка: «Привет, нуб! :)» [{balanceLabel}].",
  ],
  [MOVE_TYPES.FINISH]: [
    "Игрок {nickname} покидает карту с добычей [{balanceLabel}]",
    "Игрок {nickname} покинул(-а) лабиринт и унёс(-ла) с собой [{balanceLabel}].",
  ],
  [MOVE_TYPES.AT_MAX]: [
    "{nickname} нашёл(-ла) {requestedRewardLabel}, но лимит уже достигнут [{balanceLabel}]",
    "{nickname} пытался(-ась) унести больше, но карманы уже переполнены [{balanceLabel}]",
    "{nickname} не смог(-ла) забрать найденное сверх лимита [{balanceLabel}]",
    "{nickname} пытался(-ась) взять горсть монет, но всё высыпалось из карманов [{balanceLabel}].",
    "Котомка {nickname} оказалась переполнена, и монеты пришлось оставить [{balanceLabel}].",
    "{nickname} пытался(-ась) собрать монеты, но собрал(-а) лишь то, с чем пришёл(-ла) [{balanceLabel}].",
  ],
  [MOVE_TYPES.TO_MAX]: [
    "{nickname} нашёл(-ла) {requestedRewardLabel}, но получил(-а) только {rewardLabel} [{balanceLabel}]",
    "{nickname} упирается в лимит и забирает лишь часть находки: {rewardLabel} [{balanceLabel}]",
    "{nickname} нашёл(-ла) {requestedRewardLabel}, но унести смог(-ла) лишь {rewardLabel} [{balanceLabel}].",
  ],
  [MOVE_TYPES.AT_ZERO]: [
    "Ловушка пыталась забрать у {nickname} {requestedRewardLabel}, но забирать уже нечего [{balanceLabel}]",
    "На {nickname} напали грабители, чтобы отнять {requestedRewardLabel}, но в карманах ничего не нашли и пожалели [{balanceLabel}].",
  ],
  [MOVE_TYPES.TO_ZERO]: [
    "{nickname} теряет только {rewardLabel} и упирается в ноль по части валют [{balanceLabel}]",
    "Коллекторы добрались до {nickname} и забрали всё возможное: {rewardLabel} [{balanceLabel}]",
    "Коллекторы пытались списать со счёта {nickname} {requestedRewardLabel}, но смогли получить лишь {rewardLabel} [{balanceLabel}].",
  ],
};

const achievementTemplates = [
  'Игрок {nickname} получает достижение "{achievement}" за {description}. Награда: {rewardLabel} [{balanceLabel}]',
  'Игрок {nickname} зарабатывает достижение "{achievement}" за {description}, награда: {rewardLabel} [{balanceLabel}]',
];

interface BuildJourneyCommentArgs {
  event: JourneyForumCommentEvent;
  currencies: ConfigCurrency[];
  randomFn?: RandomFn;
}

export function buildJourneyComment({
  event,
  currencies,
  randomFn = Math.random,
}: BuildJourneyCommentArgs): string {
  const balanceLabel = formatJourneyCurrencyValues(event.balanceAfter, currencies, { includeZero: false });

  if (event.kind === "move") {
    const templates =
      event.moveType === MOVE_TYPES.ACHIEVEMENT ? moveTemplates[MOVE_TYPES.EMPTY] : moveTemplates[event.moveType];
    const rewardValues = event.appliedRewards.length ? event.appliedRewards : event.requestedRewards;

    return interpolate(randomFrom(templates, randomFn), {
      nickname: event.playerNickname,
      rewardLabel: formatRewardLabel(rewardValues, currencies, {
        showPlus: !hasNegativeJourneyRewards(rewardValues),
        absolute: hasNegativeJourneyRewards(rewardValues),
      }),
      requestedRewardLabel: formatRewardLabel(event.requestedRewards, currencies, {
        showPlus: !hasNegativeJourneyRewards(event.requestedRewards),
        absolute: hasNegativeJourneyRewards(event.requestedRewards),
      }),
      balanceLabel,
    });
  }

  return interpolate(randomFrom(achievementTemplates, randomFn), {
    nickname: event.playerNickname,
    achievement: event.achievement.title ?? event.achievement.name,
    description: event.achievement.description ?? "",
    rewardLabel: formatRewardLabel(event.appliedRewards.length ? event.appliedRewards : event.achievement.rewards, currencies, {
      showPlus: true,
    }),
    balanceLabel,
  });
}
