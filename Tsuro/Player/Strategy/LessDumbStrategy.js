const {
  Coords,
  InitialAction,
  IntermediateAction,
  Position,
  RuleChecker,
  Board,
} = require('../../Common');
const { DIRECTIONS, DIRECTIONS_CLOCKWISE, PORTS } = require('../../Common/utils/constants');
const Strategy = require('./Strategy');

// Array for determining direction to check for next valid space
const DIRECTIONS_CHECK = [DIRECTIONS.EAST, DIRECTIONS.SOUTH, DIRECTIONS.WEST, DIRECTIONS.NORTH];
// Array for determining next valid position on tile
const POSITIONS_CHECK = DIRECTIONS_CLOCKWISE.reduce(
  (acc, direction) => [
    ...acc,
    new Position(direction, PORTS.ZERO),
    new Position(direction, PORTS.ONE),
  ],
  []
);

class LessDumbStrategy extends Strategy {
  /**
   * @private
   * Gets a valid position to place an avatar on, at the given coords and
   * tile. If no such position exists, it will return null.
   *
   * @param {string} id the player's ID
   * @param {Tile} tile the tile to place at the given coords
   * @param {Coords} coords the coords to check for tile legality
   * @param {BoardState} boardState the current state of the board
   * @returns {Position|null} the first valid position to place an avatar
   * at, or null if none exists
   */
  static _getPosition(id, tile, coords, boardState) {
    let position;
    if (!boardState.getTile(coords)) {
      position = POSITIONS_CHECK.find(position =>
        RuleChecker.canPlaceAvatar(boardState, id, coords, tile, position)
      );
    }
    return position || null;
  }

  static euclideanDistance(xy1, xy2) {
    return Math.sqrt(Math.pow(xy1[0] - xy2[0], 2) + Math.pow(xy1[1] - xy2[1], 2));
  }

  static findFurthestStartingPosition(boardState) {
    const tiles = boardState.getTiles();
    const occupiedCoords = [];
    const edgeCoords = [];
    for (let i = 0; i < tiles.length; i++) {
      for (let j = 0; j < tiles[0].length; j++) {
        if (i === 0 || i === tiles.length - 1 || j === 0 || j === tiles[0].length - 1) {
          edgeCoords.push([i, j]);
        }
        if (tiles[i][j]) {
          occupiedCoords.push([i, j]);
        }
      }
    }

    let furthestDistance = 0;
    let furthestCoord = null;
    edgeCoords.forEach(option => {
      let distance = 0;
      occupiedCoords.forEach(position => {
        distance += this.euclideanDistance(option, position);
      }, this);
      if (distance > furthestDistance || !furthestCoord) {
        furthestCoord = option;
        furthestDistance = distance;
      }
    });

    return new Coords(furthestCoord[0], furthestCoord[1]);
  }

  static evaluatePosition(boardState, coords) {
    if (coords && boardState) {
      let neighbors = 0;
      DIRECTIONS_CLOCKWISE.forEach(direction => {
        if (boardState.getNeighboringTile(coords, direction)) {
          neighbors++;
        }
      });
      return 1 / (1 + neighbors);
    } else {
      return null;
    }
  }
  /**
   * Determines a player's initial action.
   *
   * @param {string} id the player's ID
   * @param {Tile[]} hand the player's current hand of tiles
   * @param {BoardState} boardState the current state of the board
   * @returns {InitialAction} the determined initial action
   */
  static getInitialAction(id, hand, boardState) {
    const tile = hand[2];
    const coords = new Coords(0, 0);

    let position = this._getPosition(id, tile, coords, boardState);

    let directionIdx = 0;
    while (!position && directionIdx < DIRECTIONS_CHECK.length) {
      try {
        coords.moveOne(DIRECTIONS_CHECK[directionIdx]);
        position = this._getPosition(id, tile, coords, boardState);
      } catch (err) {
        directionIdx += 1;
      }
    }
    if (directionIdx === DIRECTIONS_CHECK.length) {
      throw 'Not enough valid spaces on the board';
    }
    return new InitialAction(tile, coords, position);
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

    let bestTile = null;
    let bestActionValue = -1;
    hand.forEach(tile => {
      const action = this.evaluatePosition(boardState, coords);
      if (action > bestActionValue) {
        bestActionValue = action;
        bestTile = tile;
      }
    }, this);
    return new IntermediateAction(bestTile, coords);
  }
}

module.exports = LessDumbStrategy;
