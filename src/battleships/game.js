class BattleShipsGame {
  #ships;
  #shipsCoordinates;
  #moves;
  #shipsStorageService = battleShipsService;

  startGame(ships, boardSize = 6, restoredBoard, restoredShipsCoordinates) {
    this.boardSize = boardSize;
    this.board = restoredBoard ? restoredBoard : Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    this.#ships = ships;
    this.#shipsCoordinates = [];
    if (restoredBoard && restoredShipsCoordinates) {
      this.#shipsCoordinates = restoredShipsCoordinates;
    } else {
      this.#generateBoard();
    }

    this.#ships.forEach((ship) => {
      ship.coordinates = [];
    });
    this.#moves = [];
    this.#shipsStorageService.startGame(this.getBoard(), this.#shipsCoordinates);
    return this.getBoard();
  }

  #removePlacement() {
    this.#shipsCoordinates = [];
  }

  undoMove() {
    const { horizontal, vertical } = this.getLastMove();
    const ship = this.#shipsCoordinates.find((ship) => ship.some((s) => s.horizontal === horizontal && s.vertical === vertical));
    if (ship) {
      const cell = ship.find((s) => s.horizontal === horizontal && s.vertical === vertical);
      cell.isHit = false;
    }
    this.#moves.pop();
    this.#shipsStorageService.undoLastMove();
  }

  getLastMove() {
    return this.getMoves()[this.getMoves().length - 1];
  }

  isGameOver() {
    return this.#getDestroyedShips().length === this.#shipsCoordinates.length;
  }

  #getDamagedShips() {
    return this.#shipsCoordinates.filter((ship) => ship.some((s) => !s.isHit) && ship.some((s) => s.isHit));
  }

  #getDestroyedShips() {
    return this.#shipsCoordinates.filter((ship) => ship.every((s) => s.isHit));
  }

  getCurrentPrize() {
    const damagedShips = this.#getDamagedShips();
    const damagedPrize = damagedShips.reduce((prize, ship) => {
      const numberOfDamagedZones = ship.filter((cell) => cell.isHit).length;
      prize += numberOfDamagedZones * battleshipConfig.prizes.shoot;
      return prize;
    }, 0);
    const destroyedShips = this.#getDestroyedShips();
    const destroyedPrize = destroyedShips.reduce((prize, ship) => {
      prize += battleshipConfig.prizes.shoot * ship.length + battleshipConfig.prizes.destroyBonus[ship.length];
      return prize;
    }, 0);
    return destroyedPrize + damagedPrize;
  }

  getMoves() {
    return this.#moves;
  }

  makeMove(coordinates) {
    this.#moves.push(coordinates);
    this.#shipsStorageService.saveMove(coordinates);
    const cell = this.findShipByCoordinates(coordinates);
    if (cell) {
      cell.isHit = true;
    }
    return cell;
  }

  findShipByCoordinates({ horizontal, vertical }) {
    const ship = this.#shipsCoordinates.find((ship) => ship.some((s) => s.horizontal === horizontal && s.vertical === vertical));
    if (ship) {
      return ship.find((s) => s.horizontal === horizontal && s.vertical === vertical);
    }
    return;
  }

  getShips() {
    return this.#shipsCoordinates;
  }

  #placeShip(shipSize) {
    let isVertical, startX, startY;
    let isValidPlacement;
    let numberOfIterations = 0;
    do {
      isVertical = Math.random() < 0.5;
      startX = Math.floor(Math.random() * this.boardSize);
      startY = Math.floor(Math.random() * this.boardSize);
      numberOfIterations++;
      isValidPlacement = this.#isValidShipPlacement(startX, startY, shipSize, isVertical);
      if (numberOfIterations >= 1000) throw new Error("Failed place a ship");
    } while (!isValidPlacement && numberOfIterations < 1000);
    this.#shipsCoordinates.push([]);
    for (let i = 0; i < shipSize; i++) {
      const x = isVertical ? startX : startX + i;
      const y = isVertical ? startY + i : startY;
      this.board[y][x] = shipSize;
      this.#shipsCoordinates[this.#shipsCoordinates.length - 1].push({ horizontal: y + 1, vertical: x + 1, isHit: false });
    }
  }

  #isValidShipPlacement(startX, startY, shipSize, isVertical) {
    const endX = isVertical ? startX : startX + shipSize - 1;
    const endY = isVertical ? startY + shipSize - 1 : startY;
    if (endX >= this.boardSize || endY >= this.boardSize) {
      return false; // Ship goes beyond the board
    }

    for (let i = startX - 1; i <= endX + 1; i++) {
      for (let j = startY - 1; j <= endY + 1; j++) {
        if (i >= 0 && i < this.boardSize && j >= 0 && j < this.boardSize) {
          if (this.board[j][i] !== 0) {
            return false; // There is another ship nearby
          }
        }
      }
    }
    return true;
  }

  #generateBoard() {
    let isSuccess = false;
    let attempts = 0;
    while (!isSuccess && attempts < 10000) {
      attempts++;
      try {
        this.#ships.forEach((ship) => {
          for (let i = 1; i <= ship.amount; i++) {
            this.#placeShip(ship.size);
          }
        });
        isSuccess = true;
      } catch (error) {
        isSuccess = false;
        this.board = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(0));
        this.#removePlacement();
      }
    }
    console.log(`Attemts: ${attempts}`);
    if (attempts === 10000) throw new Error("Failed to place ships");
  }

  getBoard() {
    return this.board;
  }
}
