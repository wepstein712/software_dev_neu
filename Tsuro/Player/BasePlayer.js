const DumbStrategy = require('./Strategy/DumbStrategy');
const { STRATEGIES } = require('../Common/utils/constants');

const STRATEGY_MAP = {
  [STRATEGIES.DUMB]: DumbStrategy,
};

class BasePlayer {
  /**
   * Creates a new Player.
   *
   * @param {string} id the unique ID of the player
   * @param {string} name the name of the player
   * @param {string} strategy the key for the strategy implementation to
   * be used to make moves for the player
   */
  constructor(id, name, strategy) {
    this.id = id;
    this.name = name;

    const chosenStrategy = STRATEGY_MAP[strategy];
    if (!chosenStrategy) {
      throw 'Invalid strategy';
    }
    this.strategy = chosenStrategy;
  }

  /**
   * Updates the game status to either be `Current Turn` if the referee
   * is waiting on the player for action, or `Waiting` if the player's
   * turn is now over.
   *
   * @param {boolean} isCurrentTurn whether it's currently the player's turn
   */
  // eslint-disable-next-line no-unused-vars
  setTurnStatus(isCurrentTurn) {
    throw 'Implement!';
  }

  /**
   * Updates the player's personal board state, and gives them
   * the most recent view of the board.
   *
   * @param {BoardState} boardState the new BoardState given by the referee
   */
  // eslint-disable-next-line no-unused-vars
  updateState(boardState) {
    throw 'Implement!';
  }

  /**
   * Sets the player of the given ID's color to the referee-assigned color.
   *
   * @param {string} id the id of the player
   * @param {string} color the player's avatar's color
   */
  // eslint-disable-next-line no-unused-vars
  setColor(id, color) {
    throw 'Implement!';
  }

  /**
   * Gets the player's avatar's color.
   *
   * @returns {string} the player's avatar's color
   */
  getColor() {
    throw 'Implement!';
  }

  /**
   * Receives a hand given by the referee, and updated the current
   * player hand.
   *
   * @param {Tile[]} hand the new array (hand) of tiles
   */
  // eslint-disable-next-line no-unused-vars
  receiveHand(hand) {
    throw 'Implement!';
  }

  /**
   * Gets either a player's initial or intermediate action, as determined
   * by the strategy.
   *
   * @param {boolean} [isInitial=false] whether the action to retrieve
   * should be the player's initial action
   */
  // eslint-disable-next-line no-unused-vars
  getAction(isInitial = false) {
    throw 'Implement!';
  }

  /**
   * Removes all tiles from the current hand.
   */
  clearHand() {
    throw 'Implement!';
  }

  // eslint-disable-next-line no-unused-vars
  lose(forLegalMove) {
    throw 'Implement!';
  }

  /**
   * Sets the `gameStatus` to `GameOver`. This signals to the player
   * that the game is now over, and which player(s) won.
   *
   * @param {string[]} winners the player ID(s) of the winner(s)
   * of the game
   */
  // eslint-disable-next-line no-unused-vars
  endGame(winners, losers) {
    throw 'Implement!';
  }
}

module.exports = BasePlayer;
