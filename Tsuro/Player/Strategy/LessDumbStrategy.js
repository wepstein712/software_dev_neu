const {
  Coords,
  InitialAction,
  IntermediateAction,
  Position,
  RuleChecker,
} = require('../../Common');
const { DIRECTIONS, DIRECTIONS_CLOCKWISE, PORTS } = require('../../Common/utils/constants');
const Strategy = require('./Strategy');

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

  /**
   * Computes the euclidean distane between two points in 2 dimensional space.
   * @param {(number, number)} xy1 the coordinate on a cartesian plane of a point
   * @param {(number, number)} xy2 the coordinate on a cartesian plane of a point
   * @returns {number} the euclidean distance between the given 2 points.
   */
  static euclideanDistance(xy1, xy2) {
    return Math.sqrt(Math.pow(xy1[0] - xy2[0], 2) + Math.pow(xy1[1] - xy2[1], 2));
  }

  /**
   * Computes the initial placement that will be furthest from all other tiles
   * @param {BoardState} boardState the state of the current board.
   * @returns {Coords} the coordinate of the calculated furthest starting position from other tiles.
   */
  static findFurthestStartingPosition(boardState) {
    const tiles = boardState.getTiles();
    const occupiedCoords = []; //where tiles have already been placed
    const edgeCoords = []; //tiles on the edge of the board
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
        const partialDistance = this.euclideanDistance(option, position);
        if (partialDistance <= 2) {
          distance = -100000;
        }
        distance += partialDistance;
      });
      if (distance > furthestDistance || !furthestCoord) {
        furthestCoord = option;
        furthestDistance = distance;
      }
    }, this);

    return new Coords(furthestCoord[0], furthestCoord[1]);
  }

  /**
   * Computes the value of a given set of coordinates on the board. Valuing being near fewer other tiles.
   * @param {BoardState} boardState the state of the current board.
   * @param {Coords} coords the coordinates being checked.
   * @returns {number} reciprocal value of adjacent tiles. Fewer tiles means a higher score.
   * @returns {null}  boardstate or coords is invalid, returns null.
   */
  static evaluatePosition(boardState, coords) {
    if (coords && boardState) {
      return 1 / (1 + boardState.getNumberNeighboringTiles(coords));
    } else {
      return null;
    }
  }

  /**
   * Makes a list of positions that are valid given a coordinate that would lie on the outside of the board.
   * @param {Coord} coord the place we are checking
   * @param {*} maxSize the max size of the board.
   * @returns {Position[]} the positions that would be valid to put as an initial placement.
   */
  static findValidStartingPosition(coord, maxSize) {
    const validPositions = [];

    if (coord.x === 0) {
      validPositions.push(new Position(DIRECTIONS.WEST, 0));
      validPositions.push(new Position(DIRECTIONS.WEST, 1));
    }

    if (coord.y === 0) {
      validPositions.push(new Position(DIRECTIONS.NORTH, 0));
      validPositions.push(new Position(DIRECTIONS.NORTH, 1));
    }

    if (coord.x === maxSize - 1) {
      validPositions.push(new Position(DIRECTIONS.EAST, 0));
      validPositions.push(new Position(DIRECTIONS.EAST, 1));
    }

    if (coord.y === maxSize - 1) {
      validPositions.push(new Position(DIRECTIONS.SOUTH, 0));
      validPositions.push(new Position(DIRECTIONS.SOUTH, 1));
    }

    return validPositions;
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
    const placementCoord = this.findFurthestStartingPosition(boardState);

    const tile = hand[Math.floor(Math.random() * Math.floor(hand.length))].copy(
      Math.floor(Math.random() * Math.floor(4))
    );
    const startingPositions = this.findValidStartingPosition(
      placementCoord,
      boardState.getTiles().length
    );

    const position =
      startingPositions[Math.floor(Math.random() * Math.floor(startingPositions.length))];

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

    let bestTile = null;
    let bestActionValue = -1;
    hand.forEach(tile => {
      const actionValue = this.evaluatePosition(boardState, coords);
      if (actionValue > bestActionValue) {
        bestActionValue = actionValue;
        bestTile = tile;
      }
    }, this);

    return new IntermediateAction(bestTile.copy(Math.floor(Math.random() * Math.floor(4))), coords);
  }
}

module.exports = LessDumbStrategy;
