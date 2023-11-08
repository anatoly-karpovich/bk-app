const jackPotPrize = 50;
const configuration = {
  mapSize: 50,
  bonusesArray: [5, 10, 15, 20, -5, -5, -5, -5, jackPotPrize],
  initialCashValue: 50,
  minNumberOfSteps: 1,
  maxNumberOfSteps: 5,
};

const getRandomUniqueCell = getUniqueRandomNumber(1, configuration.mapSize - 1);

class GameMap {
  static instance;

  constructor() {
    if (GameMap.instance) {
      return GameMap.instance;
    }
    this.generateMap();

    GameMap.instance = this;
  }

  generateMap() {
    this.mapJson = configuration.bonusesArray.reduce((mapObject, bonus) => {
      const cell = getRandomUniqueCell();
      mapObject[cell] = bonus;
      return mapObject;
    }, {});
  }

  getMap() {
    return this.mapJson;
  }

  getJackpotCell() {
    let jackPotCell;
    for (const index in this.mapJson) {
      if (this.mapJson[index] === jackPotPrize) {
        jackPotCell = +index;
      }
    }
    return jackPotCell;
  }
}

class Player {
  constructor(nickname) {
    this.nickname = nickname;
    this._position = 0;
    this._prize = configuration.initialCashValue;
  }
  get currentPosition() {
    return this._position;
  }

  get currentPrize() {
    return this._prize;
  }

  move(numberOfSteps) {
    this._position = this._position + numberOfSteps > configuration.mapSize ? configuration.mapSize : this._position + numberOfSteps;
    const map = new GameMap();
    if (this._position !== configuration.mapSize) {
      if (this._position === map.getJackpotCell()) {
        this._prize = Game.jackpot.isObtained ? this._prize : this._prize + jackPotPrize;
        if (!Game.jackpot.isObtained) {
          Game.jackpot.isObtained = true;
          Game.jackpot.winner = this.nickname;
        }
      } else {
        this._prize += map.getMap()[this.currentPosition] ?? 0;
      }
    }
    console.log(`${this.nickname} dice: ${numberOfSteps}`);
    console.log(`${this.nickname} moved to ${this._position}`);
    console.log(`${this.nickname} got ${map.getMap()[this.currentPosition] ?? 0}`);
    console.log(`${this.nickname} prize now is ${this._prize}`);
    console.log(`==== ${this.nickname} made the move ====`);
  }
}

class Game {
  static jackpot = {};
  player = new Player("Геральт из Ривии");
  map = new GameMap();
  constructor(players = []) {
    this.moveIndex = 0;
    if (!players.length) throw new Error("No players");
    this.players = players.map((nickName) => new Player(nickName));
    Game.jackpot.isObtained = false;
  }

  makeMove() {
    this.moveIndex += 1;
    this.players.forEach((player) => player.move(dice()));
    console.log(`================ End of ${this.moveIndex} move ================`);
  }

  playTillTheEnd() {
    console.log(`Jackpot cell: `, this.map.getJackpotCell());
    let mapString = "";
    const mapJson = this.map.getMap();
    for (const cell in this.map.getMap()) {
      mapString += `On cell ${cell} there is a trap with ${mapJson[cell]}\n`;
    }
    console.log(`GameMap:\n${mapString}`);

    while (this.players.filter((p) => p.currentPosition < configuration.mapSize).length) {
      this.makeMove();
    }
    this.players.forEach((player) => console.log(`Prize for ${player.nickname}: ${player.currentPrize}`));
    if (Game.jackpot.isObtained) {
      console.log(`Jackpot is obtained by ${Game.jackpot.winner}`);
    } else {
      console.log(`Jackpot is not obtained`);
    }
    console.log(`====== Game Over ======`);
  }
}

function dice() {
  return generateNumberInRange(1, configuration.maxNumberOfSteps);
}
