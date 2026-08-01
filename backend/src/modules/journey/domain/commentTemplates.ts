// @ts-nocheck
import type { CurrencySnapshot as ConfigCurrency } from "../../../common/currency";
import { formatJourneyCurrencyValues, hasNegativeJourneyRewards } from "./currency";
import { JOURNEY_ACHIEVEMENT_NAMES, JOURNEY_ACHIEVEMENT_STREAK_TARGETS, MOVE_TYPES } from "./config";
import { toJourneyMoveCommentTemplateKind } from "./types";
import type {
  JourneyAchievement,
  JourneyCommentTemplateKind,
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

function interpolate(
  template: string,
  values: Record<string, string | number>,
  appendTerminalPunctuation = true,
): string {
  const withoutBalance = template.replace(/\s*\[\{balanceLabel\}\]/g, "");
  const result = Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    withoutBalance,
  );

  return !appendTerminalPunctuation || /[.!?…]$/.test(result) ? result : `${result}.`;
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
  [MOVE_TYPES.JACKPOT]: [
    "{nickname} получает внезапное наследство: {rewardLabel} [{balanceLabel}]",
    "{nickname} получил(-а) СМС о наследстве от пробабушки из Швейцарии: {rewardLabel} [{balanceLabel}].",
    "{nickname} сорвал(-а) джекпот в лотерее и получил(-а) {rewardLabel} [{balanceLabel}].",
    "Как не вовремя {nickname} приспичило в туалет... В поисках бумажки чуть не воспользовался(-ась) чеком на {rewardLabel} [{balanceLabel}].",
    "Фортуна наконец вспомнила пароль от аккаунта {nickname} и начислила {rewardLabel} [{balanceLabel}]",
    "Где-то заплакал предыдущий владелец сокровища. {nickname} получает {rewardLabel} [{balanceLabel}]",
    "Архивариус дрожащей рукой пересчитал казну и обнаружил недостачу ровно в {rewardLabel}, которую уже забрал(-а) {nickname} [{balanceLabel}]",
    "{nickname} нажал(-а) на подозрительную кнопку. Вместо ловушки выпало {rewardLabel}. Такое бывает примерно никогда [{balanceLabel}]",
    "Сундук долго не открывался, но после убедительного пинка от {nickname} выдал {rewardLabel} [{balanceLabel}]",
    "Обладатели достижения «Невезучий» требуют проверить {nickname} на читы. Пока идёт проверка, джекпот в {rewardLabel} уже начислен [{balanceLabel}]",
    "Древний Страж пытался(-ась) спрятать сокровища понадёжнее, но {nickname} всё равно нашёл(-ла) {rewardLabel} [{balanceLabel}]",
    "Зубастая Слизь охраняла клад много лет, но отвлеклась на бутерброд. {nickname} уносит {rewardLabel} [{balanceLabel}]",
    "Зомби Математик потребовал пароль. {nickname} сказал(-а) «пароль», и это почему-то сработало. В сундуке — {rewardLabel} [{balanceLabel}]",
    "Админ внезапно проявил человечность. {nickname} срывает джекпот на {rewardLabel} [{balanceLabel}]",
    "Голос из темноты предложил {nickname} выбрать красную или синюю таблетку. Игрок выбрал деньги: {rewardLabel} [{balanceLabel}]",
    "Алхимик попытался продать {nickname} пустой сундук, но забыл вынуть из него {rewardLabel} [{balanceLabel}]",
    "Банк ОС прилетела к {nickname}, споткнулась и рассыпала {rewardLabel}. Подбирать помогать не пришлось [{balanceLabel}]",
    "{nickname} обнаружил(-а) тайник с табличкой «На чёрный день». День оказался достаточно чёрным: внутри {rewardLabel} [{balanceLabel}]",
    "Легендарный сундук выбрал нового хозяина. К сожалению для сундука, им оказался(-ась) {nickname}. Внутри — {rewardLabel} [{balanceLabel}]",
    "Служитель Бездны объявил внеплановую инвентаризацию. {rewardLabel} уже не хватает — их уносит {nickname} [{balanceLabel}]",
    "Где-то во мраке раздался крик: «Так не должно было выпасть!» Но {nickname} уже забрал(-а) {rewardLabel} [{balanceLabel}]",
    "{nickname} нашёл(-ла) кошелёк без документов. Внутри было {rewardLabel}, а совесть временно вышла из игры [{balanceLabel}]",
    "Шут Повелителя предложил {nickname} сыграть на всё. Шут теперь без всего, а игрок получает {rewardLabel} [{balanceLabel}]",
    "Слизь проглотила клад, но икнула рядом с {nickname}. На пол выпало {rewardLabel} [{balanceLabel}]",
    "Джекпот долго искал достойного владельца, устал и остановился на {nickname}. Награда — {rewardLabel} [{balanceLabel}]",
  ],
  [MOVE_TYPES.EMPTY_JACKPOT]: [
    "{nickname} находит сундук, но его уже кто-то опустошил [{balanceLabel}]",
    "{nickname} открывает сокровищницу, а внутри только пыль и записка от предшественника [{balanceLabel}]",
    "{nickname} обнаружил(-а) огромный сундук с сокровищами, но кто-то обчистил его раньше... [{balanceLabel}].",
    "Когда {nickname} открыл(-а) сундук, внутри нашлись лишь куча пыли и записка: «Привет, нуб! :)» [{balanceLabel}].",
    "{nickname} попросил(-а) у вселенной знак. Вселенная показала средний палец [{balanceLabel}]",
    "{nickname} торжественно открывает сундук. Сундук столь же торжественно оказывается пустым [{balanceLabel}]",
    "{nickname} заглядывает в сундук и видит там отражение собственного разочарования [{balanceLabel}]",
    "{nickname} прибыл(-а) на клетку с сокровищем ко времени. К сожалению, не к тому времени [{balanceLabel}]",
    "{nickname} находит легендарный сундук. Легендарно пустой сундук [{balanceLabel}]",
    "Кто-то вынес из сундука всё ценное, но оставил {nickname} бесплатный урок пунктуальности [{balanceLabel}]",
    "{nickname} открывает сундук и получает редчайшую награду — ничего [{balanceLabel}]",
    "Сундук долго сопротивлялся, но в итоге показал {nickname}, что внутри совершенно пусто [{balanceLabel}]",
    "Внутри сундука лежала записка для {nickname}: «Надо было ходить быстрее» [{balanceLabel}]",
    "Кто-то оставил в сундуке одну монету, но нарисованную. {nickname} не впечатлён(-а) [{balanceLabel}]",
    "{nickname} заглянул(-а) внутрь и обнаружил(-а) там бездну. Бездна тоже была без денег [{balanceLabel}]",
    "Зубастая Слизь охраняла сундук от {nickname} изо всех сил. Правда, только после того, как его уже обчистили [{balanceLabel}]",
    "Страж Сокровищ предлагает {nickname} разделить сокровища поровну. Ноль пополам — тоже ноль [{balanceLabel}]",
    "Сундук для {nickname} оказался не пустым: внутри лежало глубокое чувство несправедливости [{balanceLabel}]",
    "{nickname} нашёл(-ла) место, где мог(-ла) бы стать богаче. Ключевое слово — «мог(-ла) бы» [{balanceLabel}]",
  ],
  [MOVE_TYPES.EMPTY]: [
    "{nickname} осмотрелся(-ась), но ничего не нашёл(-ла) [{balanceLabel}]",
    "{nickname} протёр(-ла) уставшие глаза, присмотрелся(-ась) и кроме паутины ничего не нашёл(-ла) [{balanceLabel}]",
    "Надпись на стене: Машка — ВЦ! Помимо этого никаких находок для {nickname}, разумеется, не нашлось. [{balanceLabel}]",
    "Раздался леденящий душу рык! А нет, просто у {nickname} заурчало в животе. Денег на клетке тоже нет [{balanceLabel}]",
    "Так тихо на клетке — хорошо хоть {nickname} может постоять тут бесплатно. [{balanceLabel}]",
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
    "{nickname} попытался(-ась) продать воздух в Торговом зале — и кто-то действительно купил его за {rewardLabel} [{balanceLabel}]",
    "{nickname} подобрал(-а) чек, который какой-то нуб выронил после хаота: {rewardLabel} [{balanceLabel}]",
    "Старый гоблин долго торговался с {nickname}, но в итоге сам доплатил {rewardLabel} [{balanceLabel}]",
    "Даже крысы решили скинуться {nickname} на счастливую жизнь: {rewardLabel} [{balanceLabel}]",
    "Сегодня сервер благосклонен к {nickname}: начислено {rewardLabel} [{balanceLabel}]",
    "Мимо пробегал единорог, споткнулся и выронил {rewardLabel}. {nickname} возражать не стал(-а) [{balanceLabel}]",
    "Где-то хлопнула дверь. Никто не понял почему, но {nickname} стал(-а) богаче на {rewardLabel} [{balanceLabel}]",
    "Маг пытался вызвать демона, но вызвал бухгалтера. Тот оформил {nickname} премию: {rewardLabel} [{balanceLabel}]",
    "{nickname} нажал(-а) кнопку «Получить ежедневную награду». На удивление, сработало: {rewardLabel} [{balanceLabel}]",
    "Система решила, что сегодня {nickname} можно не страдать, и выдала {rewardLabel} [{balanceLabel}]",
  ],
  [MOVE_TYPES.DECREASE]: [
    "{nickname} угодил(-а) в ловушку и потерял(-а) {rewardLabel} [{balanceLabel}]",
    "{nickname} попался(-ась) разбойникам и расстался(-ась) с {rewardLabel} [{balanceLabel}]",
    "Клетка вытянула из карманов {nickname} {rewardLabel} [{balanceLabel}]",
    "{nickname} споткнулся(-ась) и вместе с равновесием потерял(-а) {rewardLabel} [{balanceLabel}]",
    "{nickname} обнаружил(-а), что кошелёк стал легче на {rewardLabel} [{balanceLabel}]",
    "{nickname} нашёл(-ла) чек, попытался(-ась) его обналичить, но это оказалась ипотека на {rewardLabel} [{balanceLabel}]",
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

const achievementTemplatesByName: Partial<Record<string, string[]>> = {
  [JOURNEY_ACHIEVEMENT_NAMES.UNLUCKY]: [
    '{nickname} получает достижение "{achievement}". Столько ловушек подряд — это уже не невезение, а талант. Награда за страдания: {rewardLabel} [{balanceLabel}]',
    'Королева Грибницы посмотрела на маршрут {nickname} и впервые за долгое время искренне рассмеялась. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Даже Зубастая Слизь не понимает, как {nickname} удалось наступить на столько ловушек подряд. Получено "{achievement}", награда — {rewardLabel} [{balanceLabel}]',
    'Путь был свободен почти везде, но {nickname} безошибочно выбрал(-а) кучу ловушек подряд. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    '{nickname} доказал(-а), что дно — это не точка, а направление движения. Достижение "{achievement}", утешительные {rewardLabel} [{balanceLabel}]',
    'Куча ловушек подряд нашли {nickname}. Или всё-таки {nickname} нашёл(-ла) их? Получено достижение "{achievement}", награда — {rewardLabel} [{balanceLabel}]',
    'Архивариус записывает новый феномен: {nickname} умеет находить ловушки даже там, где их никто не искал. Получено достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    `Карта пыталась намекнуть. Потом предупредить. Потом ударила ${JOURNEY_ACHIEVEMENT_STREAK_TARGETS.unlucky} раза. {nickname} получает достижение "{achievement}" и {rewardLabel} [{balanceLabel}]`,
    'Повелитель снимает шлем перед мастерством {nickname}: столько ловушек подряд — такое ещё нужно суметь. Получено достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Для всех это ловушки. Для {nickname} — обязательные точки маршрута. Достижение "{achievement}", награда {rewardLabel} [{balanceLabel}]',
    '{nickname} собирает ловушки с такой уверенностью, будто за них дают отдельный приз. И ведь теперь дают: "{achievement}", {rewardLabel} [{balanceLabel}]',
  ],
  [JOURNEY_ACHIEVEMENT_NAMES.CAREFUL]: [
    '{nickname} проходит по клеткам и не трогает вообще ничего. Достижение "{achievement}", награда — {rewardLabel} [{balanceLabel}]',
    'Хищная Слизь приготовилась нападать, но {nickname} прошёл(-ла) настолько тихо, что её пришлось разбудить после игры. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Сторожевая Грибоножка так и не заметила, как {nickname} прошёл(-ла) мимо. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    '{nickname} передвигался(-ась) настолько осторожно, что даже пыль осталась лежать на месте. Достижение "{achievement}", награда {rewardLabel} [{balanceLabel}]',
    '{nickname} последние полчаса смотрел(-а) на подозрительные клетки и всякий раз решал(-а): «Не сегодня». Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Ни один сундук не открыт, ни одна ловушка не потревожена. Паранойя {nickname} приносит достижение "{achievement}" и {rewardLabel} [{balanceLabel}]',
    'Инстинкт самосохранения {nickname} внезапно заработал без ошибок. Получено достижение "{achievement}", награда — {rewardLabel} [{balanceLabel}]',
    'Архивариус хотел записать приключения {nickname}, но записывать оказалось нечего: игрок всё обошёл(-ла). Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    '{nickname} прошёл(-ла) последние клетки в режиме «руками ничего не трогать». Система выдаёт "{achievement}" и {rewardLabel} [{balanceLabel}]',
    `Даже ловушки обиделись: {nickname} ${JOURNEY_ACHIEVEMENT_STREAK_TARGETS.careful} раза подряд их проигнорировал(-а). Достижение "{achievement}", {rewardLabel} [{balanceLabel}]`,
  ],
  [JOURNEY_ACHIEVEMENT_NAMES.COLLECTOR]: [
    'В коллекции {nickname} теперь есть всё: удача, боль и сомнительные жизненные решения. Получено достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Сэймос вручает {nickname} почётную грамоту за изучение всей пещерной инфраструктуры. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    '{nickname} лично проверил(-а) каждый тип клетки. Да, включая те, которые нормальные люди обходят. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Епископ закрывает последний пункт в списке {nickname}: коллекция завершена. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'От маленькой находки до большой ловушки — {nickname} попробовал(-а) всё. Получено достижение "{achievement}", награда {rewardLabel} [{balanceLabel}]',
    'Теперь {nickname} может проводить экскурсии: все виды клеток изучены лично. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Пещерные боссы сверили журналы посещений. {nickname} отметился(-ась) везде. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    '{nickname} собрал(-а) полный набор впечатлений: приятных, болезненных и финансово сомнительных. Получено достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Коллекция {nickname} официально признана полной. Экспонаты местами кусаются, но это уже детали. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
  ],
  [JOURNEY_ACHIEVEMENT_NAMES.LUCKY]: [
    '{nickname} находит уже которую награду подряд. Алхимик официально выбрал любимчика: Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Перебежчик Брут требует проверить {nickname} на запрещённые свитки удачи. Пока проверяют — достижение "{achievement}" и {rewardLabel} [{balanceLabel}]',
    'Даже Алхимик начал ходить следом за {nickname} в надежде подобрать что-нибудь ценное для перепродажи нубам за реал. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Похоже, {nickname} случайно оформил(-а) подписку на удачу. Получено достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Обладатели достижения «Невезучий» требуют понерфить {nickname}: столько наград подряд — это уже неприлично. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Фортуна окончательно переехала к {nickname}. Достижение "{achievement}", награда {rewardLabel} [{balanceLabel}]',
    `Уже ${JOURNEY_ACHIEVEMENT_STREAK_TARGETS.lucky} удачных клеток подряд подтверждают: сегодня главный герой — {nickname}. Получено достижение "{achievement}", {rewardLabel} [{balanceLabel}]`,
    'Кроличья лапка начала тереться о {nickname} на удачу. Получено достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    '{nickname} собрал(-а) такую серию наград, что админ уже звонит ведущему. Достижение "{achievement}", {rewardLabel} [{balanceLabel}]',
    'Система сообщает: вероятность происходящего всё ещё ненулевая. {nickname} получает достижение "{achievement}" и {rewardLabel} [{balanceLabel}]',
  ],
};

const emptyRewardTemplates = {
  jackpot: [
    "{nickname} находит сокровище, но награда не выпадает.",
    "Сундук достаётся {nickname}, но внутри оказывается пусто.",
  ],
  achievement: [
    "Достижение «{achievement}» достаётся {nickname}, но награда не выпадает.",
    "{nickname} получает достижение «{achievement}», но без дополнительной награды.",
  ],
};

const skipTemplates = ["{nickname} пропускает ход."];

export const JOURNEY_FORUM_MAP_CELL_TEMPLATE = "На клетке {position} находится {cellType} на {rewardLabel}";

export const JOURNEY_COMMENT_TEMPLATES: Record<JourneyCommentTemplateKind, string[]> = {
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.JACKPOT)]: moveTemplates[MOVE_TYPES.JACKPOT],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.EMPTY_JACKPOT)]: moveTemplates[MOVE_TYPES.EMPTY_JACKPOT],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.INCREASE)]: moveTemplates[MOVE_TYPES.INCREASE],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.DECREASE)]: moveTemplates[MOVE_TYPES.DECREASE],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.EMPTY)]: moveTemplates[MOVE_TYPES.EMPTY],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.FINISH)]: moveTemplates[MOVE_TYPES.FINISH],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.AT_MAX)]: moveTemplates[MOVE_TYPES.AT_MAX],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.TO_MAX)]: moveTemplates[MOVE_TYPES.TO_MAX],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.TO_ZERO)]: moveTemplates[MOVE_TYPES.TO_ZERO],
  [toJourneyMoveCommentTemplateKind(MOVE_TYPES.AT_ZERO)]: moveTemplates[MOVE_TYPES.AT_ZERO],
  "jackpot:empty_reward": emptyRewardTemplates.jackpot,
  "achievement:unlucky": achievementTemplatesByName[JOURNEY_ACHIEVEMENT_NAMES.UNLUCKY] ?? achievementTemplates,
  "achievement:careful": achievementTemplatesByName[JOURNEY_ACHIEVEMENT_NAMES.CAREFUL] ?? achievementTemplates,
  "achievement:collector": achievementTemplatesByName[JOURNEY_ACHIEVEMENT_NAMES.COLLECTOR] ?? achievementTemplates,
  "achievement:lucky": achievementTemplatesByName[JOURNEY_ACHIEVEMENT_NAMES.LUCKY] ?? achievementTemplates,
  "achievement:empty_reward": emptyRewardTemplates.achievement,
  skip: skipTemplates,
};

export function renderJourneyCommentTemplate(
  template: string,
  values: Record<string, string | number>,
  options: { appendTerminalPunctuation?: boolean } = {},
): string {
  return interpolate(template, values, options.appendTerminalPunctuation);
}

interface JourneyResourceMoveCommentInput {
  playerNickname: string;
  moveType: JourneyMoveType;
  rewardLabel: string;
  requestedRewardLabel: string;
  randomFn?: RandomFn;
}

export function buildJourneyResourceMoveComment({
  playerNickname,
  moveType,
  rewardLabel,
  requestedRewardLabel,
  randomFn = Math.random,
}: JourneyResourceMoveCommentInput): string {
  const templates = moveTemplates[moveType] ?? moveTemplates[MOVE_TYPES.EMPTY];
  return interpolate(randomFrom(templates, randomFn), {
    nickname: playerNickname,
    rewardLabel,
    requestedRewardLabel,
  });
}

interface JourneyResourceAchievementCommentInput {
  playerNickname: string;
  achievement: JourneyAchievement;
  rewardLabel: string | null;
  randomFn?: RandomFn;
}

export function buildJourneyResourceAchievementComment({
  playerNickname,
  achievement,
  rewardLabel,
  randomFn = Math.random,
}: JourneyResourceAchievementCommentInput): string {
  if (!rewardLabel) {
    return interpolate(randomFrom(emptyRewardTemplates.achievement, randomFn), {
      nickname: playerNickname,
      achievement: achievement.title ?? achievement.name,
    });
  }

  const templates = achievementTemplatesByName[achievement.name] ?? achievementTemplates;
  return interpolate(randomFrom(templates, randomFn), {
    nickname: playerNickname,
    achievement: achievement.title ?? achievement.name,
    description: achievement.description ?? "",
    rewardLabel,
  });
}

export function buildJourneyEmptyJackpotRewardComment(
  playerNickname: string,
  randomFn: RandomFn = Math.random,
): string {
  return interpolate(randomFrom(emptyRewardTemplates.jackpot, randomFn), { nickname: playerNickname });
}

export function buildJourneySkipComment(playerNickname: string, randomFn: RandomFn = Math.random): string {
  return interpolate(randomFrom(skipTemplates, randomFn), { nickname: playerNickname });
}

interface BuildJourneyCommentArgs {
  event: JourneyForumCommentEvent;
  currencies: ConfigCurrency[];
  randomFn?: RandomFn;
}

export function buildJourneyComment({ event, currencies, randomFn = Math.random }: BuildJourneyCommentArgs): string {
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

  const templates = achievementTemplatesByName[event.achievement.name] ?? achievementTemplates;

  return interpolate(randomFrom(templates, randomFn), {
    nickname: event.playerNickname,
    achievement: event.achievement.title ?? event.achievement.name,
    description: event.achievement.description ?? "",
    rewardLabel: formatRewardLabel(
      event.appliedRewards.length ? event.appliedRewards : event.achievement.rewards,
      currencies,
      {
        showPlus: true,
      },
    ),
    balanceLabel,
  });
}
