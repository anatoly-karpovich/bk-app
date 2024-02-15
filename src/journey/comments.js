function getCommentMessage(moveOptions) {
  let moveType = moveOptions.type;
  const message = getRandomValueFromArray(commentMessages[moveType]);
  return setParametersToComment(message, moveOptions);
}

function setParametersToComment(comment, moveOptions) {
  let result = comment
    .replace("(Ник)", `${moveOptions.player.nickname}`)
    // .replace("(клетка)", `${moveOptions.currentPosition}`)
    .replace("(бонус)", `${Math.abs(moveOptions.cell?.isJackPot ? jackPotPrize : moveOptions.cell?.prize)}`)
    .replace("(приз)", `${moveOptions.achivements.length ? moveOptions.player.getCurrentPrize() : moveOptions.player.getFullPrize()}`)
    .replace("(разница)", `${moveOptions.prize - moveOptions.previousPrize}`)
    .replaceAll("(валюта)", `${configuration.currency}`);
  if (moveOptions.type === MOVE_TYPES.MOVE_TO_ACHIVEMENT) {
    result = result
      .replace("(достижение)", `"${bonusesNamesMapper[getAchivementByName(moveOptions.achivement.name).name]}"`)
      .replace("(описание достижения)", `${getAchivementByName(moveOptions.achivement.name).description}`)
      .replace("(бонус достижения)", `${getAchivementByName(moveOptions.achivement.name).prize}`);
  }
  return result;
}

const commentMessages = {
  [MOVE_TYPES.MOVE_WITHOUT_BONUS]: [
    `(Ник) осмотрелся(-ась), но ничего не нашел [(приз) (валюта)]`,
    `(Ник) протер(-ла) уставшие глаза, присмотрелся(-ась) и кроме паутины ничего не нашел(-ла) [(приз) (валюта)]`,
    `Надпись на стене: Машка - ВЦ! Помимо этого никаких (валюта) для (Ник), разумеется, не нашлось. [(приз) (валюта)]`,
    `Раздался леденящий душу рык! А нет, просто в животе у (Ник) заурчало.. Еще и денег на клетке нету [(приз) (валюта)]`,
    `Так тихо на клетке, ну хорошо хоть (Ник) может постоять тут бесплатно. [(приз) (валюта)]`,
    `Под ногой у (Ник) заскрежетали камешки. Ничего особенного не обнаружено [(приз) (валюта)].`,
    `Тишина означает одно - ничего не получишь, (Ник)! [(приз) (валюта)].`,
    `(Ник) осмотрел(-а) каждый угол, но не увидел(-а) ничего, кроме стен [(приз) (валюта)]`,
    `Следы обещали что-то интересное, но не для (Ник) [(приз) (валюта)].`,
    `Клетка выглядела подозрительно пустой. (Ник) ничего не обнаружил(-а) [(приз) (валюта)].`,
    `(Ник) запрыгнул(-а) на клетку, но ни сокровищ, ни ответов не нашел(-ла) [(приз) (валюта)].`,
    `(Ник) ощутил(-а) лишь пустоту, даже шорохов не было слышно [(приз) (валюта)]`,
    `На клетке нашлась старинная лампа! (Ник) потер(-ла), но ничего не случилось... Лампочка накаливания же... [(приз) (валюта)]`,
    `(Ник) решил(-а) почесать ВЦ. И руки в тепле, и платить не надо! [(приз) (валюта)]`,
  ],
  [MOVE_TYPES.MOVE_WITH_INCREASING_PRIZE]: [
    `(Ник) наткнулся(-ась) на скелет путника, и в его руке обнаружил(-а) крепко сжатый чек на (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) опережая всех летел(-а) без оглядки и не заметил(-а) растяжку… Споткнувшись пробил(-а) головой стену и обнаружил(-а) в ней чек на (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) нащупал(-а) в стене гнездо пауков. Когда те разбежались, заметил(-а) и вытащил(-а) чек на (бонус) (валюта) [(приз) (валюта)].`,
    `- Акцио бонусы! - прокричал(-а) (Ник), и впервые в жизни это сработало! В руках появился чек на (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) нашел(-ла) забытый сейф, в котором, при открытии, нашлось (бонус) (валюта) [(приз) (валюта)].`,
    `Случайный подарок от Феи Удачи принес (Ник) (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) решился(-лась) поцеловать спящую красавицу за (бонус) (валюта). Красавица правда была так себе и уже холодной... [(приз) (валюта)].`,
    `Пройдя танцевальный баттл против команды Катакомб, (Ник) заработал(-а) (бонус) (валюта) за свои необычные движения [(приз) (валюта)].`,
    `Став экспертом по анекдотам, (Ник) получил(-а) (бонус) (валюта) за самый смешной анекдот [(приз) (валюта)].`,
    `(Ник) одержал(-а) победу в конкурсе на самый смешной костюм и получил (бонус) (валюта) как приз [(приз) (валюта)].`,
    `За победу над Сторожевой Грибоножкой в Камень-Ножницы-Бумага (Ник) получает (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) решил(-а) отдохнуть в брошенном спальном мешке, а в нем была заначка в виде (бонус) (валюта) [(приз) (валюта)].`,
  ],
  [MOVE_TYPES.MOVE_WITH_DECREASING_PRIZE]: [
    `Сделав неосторожный шаг, (Ник) наступил(-а) на спящую ядовиту змею… На покупку противоядия ушло (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник), заблудившись, нашел(-ла) ящик вина. Пытаясь утолить жажду напился(-лась) до чертиков... На оплату вытрезвителя ушло (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) ступил(-а) на клетку и летя, не помня себя от ужаса угодил в капкан. Скорая помощь стоила (бонус) (валюта) [(приз) (валюта)].`,
    `За превышение скорости передвижения по клеткам, (Ник) оштрафован(-а) на (бонус) (валюта) сотрудниками ГАИ [(приз) (валюта)].`,
    `(Ник) наступил(-а) на клетку и обнаружил(-а), что кошелек стал легче на (бонус) (валюта) [(приз) (валюта)].`,
    `Клетка поглотила (бонус) (валюта) из карманов (Ник), как чёрная дыра [(приз) (валюта)].`,
    `Запыхавшись, (Ник) закурил(-а) в общественном месте, за что тутже получил(-а) штраф в размере (бонус) (валюта) [(приз) (валюта)].`,
    `Считая деньги в кошельке, (Ник) понял(-а), что потерял (бонус) (валюта) [(приз) (валюта)].`,
    `Сунув руку в карман, (Ник) нашел(-ла) лишь дырку, осознав что потерял(-а) (бонус) (валюта) [(приз) (валюта)].`,
    `Споткнувшись о порог, у (Ник) из рук выпало (бонус) (валюта) и укатилось в щель [(приз) (валюта)].`,
    `(Ник) потерял(-а) (бонус) (валюта). Кажется, это была скрытая комиссия [(приз) (валюта)].`,
    `(Ник) узнал(-а), что получает наследство! В наследство достался долг в (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) нашел магический артефакт, который оказался проклят - шаману пришлось заплатить (бонус) (валюта) [(приз) (валюта)].`,
    `(Ник) узнал(-а), что Эми Тейли подала в суд на алименты. Пришлось заплатить (бонус) (валюта) [(приз) (валюта)].`,
  ],
  [MOVE_TYPES.MOVE_WITH_JACKPOT]: [
    `(Ник) пришла смс о получении наследства от пробабушки из Швейцарии в размере (бонус) (валюта) (сокровище) [(приз) (валюта)].`,
    `(Ник) получил(-а) выигрыш в лотерее, сорвав джекпот в размере (бонус) (валюта) (сокровище) [(приз) (валюта)].`,
    `Как не вовремя (Ник) приспичило в туалет... В поисках бумажки чуть не воспользовался(-ась) найденным чеком на (бонус) (валюта) (сокровище) [(приз) (валюта)].`,
  ],
  [MOVE_TYPES.MOVE_WITH_EMPTY_JACKPOT]: [
    `(Ник) обнаружил(-а) огромный сундук с сокровищами, но кто-то обчистил его раньше... [(приз) (валюта)].`,
    `Когда (Ник) открыл(-а) сундук, внутри нашлись лишь куча пыли и записка 'Привет, нуб! :)' [(приз) (валюта)].`,
  ],
  [MOVE_TYPES.MOVE_TO_FINISH]: [`Игрок (Ник) покинул(-а) лабиринт, унеся с собой [(приз) (валюта)].`],

  [MOVE_TYPES.MOVE_WITN_MAX_PRIZE]: [
    `(Ник) пытался(-лась) взять горсть монет, но все высыпались из карманов [(приз) (валюта)].`,
    `Котомка (Ник) оказалась уже переполнена, и монеты пришлось оставить [(приз) (валюта)]. `,
    `(Ник) пытался(-лась) собрать монеты, но всё из рук сыпалось, и собрал(-а) лишь то, с чем пришел(-ла) [(приз) (валюта)]. `,
  ],

  [MOVE_TYPES.MOVE_TO_MAX_PRIZE]: [`(Ник) нашел(-ла) (бонус) (валюта), но уснести смог лишь (разница) (валюта) [(приз) (валюта)].`],

  [MOVE_TYPES.MOVE_WITH_ZERO_PRIZE]: [`На (Ник) напали грабители с целью отнять (бонус) (валюта), но не найдя в карманах ничего, накормили и пожалели [(приз) (валюта)]`],

  [MOVE_TYPES.MOVE_TO_ZERO_PRIZE]: [`Коллекторы пытались списать со счета (Ник) (бонус) (валюта), но смогли получить лишь (разница) (валюта) [(приз) (валюта)].`],

  [MOVE_TYPES.MOVE_TO_ACHIVEMENT]: [`Игрок (Ник) зарабатывает достижение (достижение) за (описание достижения), награда: (бонус достижения) (валюта) [(приз) (валюта)]`],
};
