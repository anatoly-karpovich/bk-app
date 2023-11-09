class GameMap {
  getRandomUniqueCell = getUniqueRandomNumber(1, configuration.mapSize);
  constructor() {
    this.generateMap();
  }

  generateMap() {
    this.mapJson = configuration.bonusesArray.reduce((mapObject, bonus) => {
      const cell = this.getRandomUniqueCell();
      if (cell) {
        mapObject[cell] = bonus;
      }
      return mapObject;
    }, {});
    logger.logMap(this.mapJson);
  }

  getMap() {
    return this.mapJson;
  }

  getMapPrettified() {
    let mapPrettified = "";
    for (const index in this.getMap()) {
      const bonus = this.getMap()[index].prize;
      const bonusType = bonus < 0 ? "ловушка" : bonus == jackPotPrize ? "сокровище" : "бонус";
      mapPrettified += `На клетке ${index} находится ${bonusType} на ${bonus} екр` + "\n";
    }
    return mapPrettified;
  }

  getJackpotCell() {
    let jackPotCell = 0;
    for (const index in this.mapJson) {
      if (this.mapJson[index].prize === jackPotPrize) {
        jackPotCell = +index;
      }
    }
    return jackPotCell;
  }

  logMap() {
    let mapString = "";
    const mapJson = this.getMap();
    for (const cell in this.getMap()) {
      mapString += `On cell ${cell} there is a trap with ${mapJson[cell].prize}\n`;
    }
    logger.log(`Game map:\n${mapString}\n`);
  }
}
