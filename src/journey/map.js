class GameMap {
  mapJson;
  getRandomUniqueCell = getUniqueRandomNumber(1, configuration.mapSize);
  constructor(mapJson) {
    this.generateMap(mapJson);
  }

  generateMap(mapJson) {
    if (mapJson) {
      this.mapJson = mapJson;
    } else {
      this.mapJson = configuration.bonusesArray.reduce((mapObject, bonus) => {
        const cell = this.getRandomUniqueCell();
        if (cell) {
          mapObject[cell] = bonus;
        }
        return mapObject;
      }, {});
    }
  }

  getMap() {
    return this.mapJson;
  }

  getMapPrettified() {
    let mapPrettified = "";
    for (const index in this.getMap()) {
      const cell = this.getMap()[index];
      let cellType = "";
      let prize = cell.prize;
      if (cell.prize < 0) {
        cellType = "ловушка";
      } else if (cell.prize > 0) {
        cellType = "награда";
      } else if (cell.isJackPot) {
        cellType = "сокровище";
        prize = jackPotPrize;
      }
      mapPrettified += `На клетке ${index} находится ${cellType} на ${prize} ${configuration.currency}` + "\n";
    }
    return mapPrettified;
  }

  getJackpotCell() {
    let jackPotCell = 0;
    for (const index in this.mapJson) {
      if (this.mapJson[index].isJackPot) {
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
    Game.logger.log(`Game map:\n${mapString}\n`);
  }
}
