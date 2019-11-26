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

class LonelyStrategy extends Strategy {
  /**
   * @private
   * Computes the initial placement that will be furthest from all other tiles. Does this by valuing the
   * largest summed distances from all occupied spaces for each occupied tile.
   *
   * @param {BoardState} boardState the state of the current board.
   * @returns {Coords} the coordinate of the calculated furthest starting position from other tiles.
   */
  static _findFurthestStartingPosition(boardState) {
    const occupiedCoords = []; // Coords of where tiles have already been placed
    const borderCoords = []; // Coords of tiles on the border of the board we can place on

    // Traverse the board and push all border coords. Push all occupied border coords as well
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const coord = new Coords(i, j);
        if (i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1) {
          if (boardState.getTile(coord)) {
            // There is a tile here, record it
            occupiedCoords.push(coord);
          } else {
            borderCoords.push(coord);
          }
        }
      }
    }

    let furthestDistance = 0;
    let furthestCoord = null;
    // Consider each border coord to each occupied coord
    borderCoords.forEach(borderCoord => {
      let distance = 0;
      // Sum the distances between the border coord and all occupied coords
      occupiedCoords.forEach(occupiedCoord => {
        const partialDistance = Coords.euclideanDistance(borderCoord, occupiedCoord);
        distance += partialDistance;
      });
      // Keep track of and return the border coord with the highest summed distance from all occupied tiles
      if (distance > furthestDistance || !furthestCoord) {
        furthestCoord = borderCoord;
        furthestDistance = distance;
      }
    });
    return furthestCoord;
  }

  /**
   * @private
   * Computes the "value" of the given coordinate based on the current boardstate.
   * Fewer neighboring tiles results in a higher value for the given coordinate.
   *
   * @param {BoardState} boardState the state of the current board.
   * @param {Coords} coords the coordinates being checked.
   * @returns {number} reciprocal value of adjacent tiles. Fewer tiles means a higher score.
   */
  _getActionValue(boardState, coords) {
    if (coords && boardState) {
      return 1 / (1 + boardState.getNumberOfNeighboringTiles(coords));
    } else {
      return -1;
    }
  }

  /**
   * @private
   * Makes a list of positions that are valid given a coordinate that would lie on the outside of the board.
   *
   * @param {Coords} coord the place we are checking
   * @returns {Position[]} the positions that would be valid to put as an initial placement.
   */
  _findValidStartingPosition(coord) {
    const validPositions = [];

    /**
     * Pushes a pair of positions for ports 0 and 1 with the given direction to the validPositions array.
     * @param {string} direction The direction for the new positions
     */
    const addPositionsForDirection = direction => {
      [PORTS.ZERO, PORTS.ONE].forEach(port => {
        validPositions.push(new Position(direction, port));
      });
    };

    if (coord.x === 0) {
      addPositionsForDirection(DIRECTIONS.WEST);
    }

    if (coord.y === 0) {
      addPositionsForDirection(DIRECTIONS.NORTH);
    }

    if (coord.x === BOARD_SIZE - 1) {
      addPositionsForDirection(DIRECTIONS.EAST);
    }

    if (coord.y === BOARD_SIZE - 1) {
      addPositionsForDirection(DIRECTIONS.SOUTH);
    }
    return validPositions;
  }

  /**
   * @private
   * Returns a random item from the given array.
   *
   * @param {Array} array The array to randomly pick from.
   * @returns {Object} A random item from the array.
   */
  static _randomItem(array) {
    const max = array.length;
    const index = Math.floor(Math.random() * Math.floor(max));
    return array[index];
  }

  /**
   * Determines a player's initial action, favoring options furthest from other players.
   * Use's the RuleChecker to see which tiles and rotations are safe and randomly selects from those options.
   *
   * @param {string} id the player's ID
   * @param {Tile[]} hand the player's current hand of tiles
   * @param {BoardState} boardState the current state of the board
   * @returns {InitialAction} the determined initial action
   */
  static getInitialAction(id, hand, boardState) {
    const placementCoord = this._findFurthestStartingPosition(boardState); // Find furthest placement
    const startingPositions = this._findValidStartingPosition(placementCoord); // Determine all valid starting positions
    const position = this._randomItem(startingPositions); // Randomly pick from all starting positions
    // Now that we've found the best spot to start in, find all tile configs in hand that work
    const validStartingTiles = [];
    hand.forEach(tile => {
      for (let i = 0; i < 4; i++) {
        // 4 Rotations
        const tileCopy = tile.copy(i);
        // If we can put our avatar here, consider this tile
        if (RuleChecker.canPlaceAvatar(boardState, id, placementCoord, tileCopy, position)) {
          validStartingTiles.push(tileCopy);
        }
      }
    });
    const tile = this._randomItem(validStartingTiles);
    return new InitialAction(tile, placementCoord, position);
  }

  /**
   * Determines a player's intermediate action, based on checking each tile and rotation
   * in hand and picking the placement that yields the highest action value (The loneliest tile).
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
    mockPlayer.receiveHand(hand);

    let bestAction = null;
    let bestActionValue = -1;
    // Find the best tile and rotation in hand with to return the best valued action
    hand.forEach(tile => {
      for (let i = 0; i < 4; i++) {
        // 4 Rotations
        const action = new IntermediateAction(tile.copy(i), coords);
        if (RuleChecker.canTakeAction(boardState, action, mockPlayer)) {
          // The best action is the one with the highest Action value
          const actionValue = this._getActionValue(boardState, coords);
          if (actionValue > bestActionValue) {
            bestActionValue = actionValue;
            bestAction = action;
          }
        }
      }
    });
    return bestAction;
  }
}

module.exports = LonelyStrategy;
