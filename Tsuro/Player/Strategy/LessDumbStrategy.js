const {
  Coords,
  InitialAction,
  IntermediateAction,
  Position,
  RuleChecker,
} = require('../../Common');
const { DIRECTIONS, PORTS, BOARD_SIZE } = require('../../Common/utils/constants');
const Strategy = require('./Strategy');
const Player = require('../Player');

class LessDumbStrategy extends Strategy {
  /**
   * Computes the initial placement that will be furthest from all other tiles
   *
   * @param {BoardState} boardState the state of the current board.
   * @returns {Coords} the coordinate of the calculated furthest starting position from other tiles.
   */
  static findFurthestStartingPosition(boardState) {
    const tiles = boardState.getTiles();
    const occupiedCoords = []; // Where tiles have already been placed [x,y]
    const edgeCoords = []; // Tiles on the edge of the board [x,y]
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1) {
          edgeCoords.push(new Coords(i, j));
        }
        if (tiles[i][j]) {
          occupiedCoords.push(new Coords(i, j));
        }
      }
    }

    let furthestDistance = 0;
    let furthestCoord = null;
    edgeCoords.forEach(edgeCoord => {
      let distance = 0;
      occupiedCoords.forEach(occupiedCoord => {
        const partialDistance = Coords.euclideanDistance(edgeCoord, occupiedCoord);
        if (partialDistance <= 2) {
          distance = -100000;
        }
        distance += partialDistance;
      });
      if (distance > furthestDistance || !furthestCoord) {
        furthestCoord = edgeCoord;
        furthestDistance = distance;
      }
    }, this);
    return furthestCoord;
  }

  /**
   * Computes the "value" of the given coordinate based on the current boardstate.
   * Fewer neighboring tiles results in a higher value for the given coordinate.
   *
   * @param {BoardState} boardState the state of the current board.
   * @param {Coords} coords the coordinates being checked.
   * @returns {number} reciprocal value of adjacent tiles. Fewer tiles means a higher score.
   * @returns {null}  boardstate or coords is invalid, returns null.
   */
  static evaluatePosition(boardState, coords) {
    if (coords && boardState) {
      return 1 / (1 + boardState.getNumberOfNeighboringTiles(coords));
    } else {
      return null;
    }
  }

  /**
   * Makes a list of positions that are valid given a coordinate that would lie on the outside of the board.
   *
   * @param {Coords} coord the place we are checking
   * @returns {Position[]} the positions that would be valid to put as an initial placement.
   */
  static findValidStartingPosition(coord) {
    const validPositions = [];

    if (coord.x === 0) {
      validPositions.push(new Position(DIRECTIONS.WEST, PORTS.ZERO));
      validPositions.push(new Position(DIRECTIONS.WEST, PORTS.ONE));
    }

    if (coord.y === 0) {
      validPositions.push(new Position(DIRECTIONS.NORTH, PORTS.ZERO));
      validPositions.push(new Position(DIRECTIONS.NORTH, PORTS.ONE));
    }

    if (coord.x === BOARD_SIZE - 1) {
      validPositions.push(new Position(DIRECTIONS.EAST, PORTS.ZERO));
      validPositions.push(new Position(DIRECTIONS.EAST, PORTS.ONE));
    }

    if (coord.y === BOARD_SIZE - 1) {
      validPositions.push(new Position(DIRECTIONS.SOUTH, PORTS.ZERO));
      validPositions.push(new Position(DIRECTIONS.SOUTH, PORTS.ONE));
    }
    return validPositions;
  }

  /**
   * Returns a random integer on the interval [0, max)
   *
   * @param {number} max the max value of the interval, non-inclusive.
   * @returns {number} a random number on the interval.
   */
  static randomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  /**
   * Determines a player's initial action. Use's the rulechecker to see which tiles and rotations are safe
   * and randomly selects from those options.
   *
   * @param {string} id the player's ID
   * @param {Tile[]} hand the player's current hand of tiles
   * @param {BoardState} boardState the current state of the board
   * @returns {InitialAction} the determined initial action
   */
  static getInitialAction(id, hand, boardState) {
    const placementCoord = this.findFurthestStartingPosition(boardState); // Find furthest placement
    const startingPositions = this.findValidStartingPosition(placementCoord); // Determine all valid starting positions
    const position = startingPositions[this.randomInt(startingPositions.length)]; // Randomly pick from all starting pos
    const validStartingTiles = [];
    hand.forEach(tile => {
      for (let i = 0; i < 4; i++) {
        const tileCopy = tile.copy(i);
        if (RuleChecker.canPlaceAvatar(boardState, id, placementCoord, tileCopy, position)) {
          validStartingTiles.push(tileCopy);
        }
      }
    });
    const tile = validStartingTiles[this.randomInt(validStartingTiles.length)];
    return new InitialAction(tile, placementCoord, position);
  }

  /**
   * Determines a player's intermediate action. This action will use the first
   * tile in the player's hand and place it on the adjacent square.
   *
   * @param {string} id the player's ID
   * @param {Tile[]} hand the player's current hand of tiles
   * @param {BoardState} boardState the current state of the board
   * @returns {IntermediateAction} the determined intermediate action
   */
  static getIntermediateAction(id, hand, boardState) {
    const avatar = boardState.getAvatar(id);
    const coords = avatar.coords.copy().moveOne(avatar.position.direction);
    const mockPlayer = new Player(id, id, null);
    mockPlayer.hand = hand;

    // Determine the best tile to use by evaluating each one's position for a ranking value
    let bestAction = new IntermediateAction(hand[0].copy(), coords);
    let bestActionValue = -1;
    hand.forEach(tile => {
      for (let i = 0; i < 4; i++) {
        const action = new IntermediateAction(tile.copy(i), coords);
        if (RuleChecker.canTakeAction(boardState, action, mockPlayer)) {
          const actionValue = this.evaluatePosition(boardState, coords);
          if (actionValue > bestActionValue) {
            bestActionValue = actionValue;
            bestAction = action;
          }
        }
      }
    }, this);
    return bestAction;
  }
}

module.exports = LessDumbStrategy;
