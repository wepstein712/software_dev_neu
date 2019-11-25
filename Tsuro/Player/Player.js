const BasePlayer = require('./BasePlayer');
const { BoardState } = require('../Common');
const { GAME_STATUS } = require('../Common/utils/constants');

class Player extends BasePlayer {
  /**
   * @constructor
   * Creates a new Player, with an empty hand. Sets `gameStatus`
   * to `Waiting` and the `boardState` to an empty board.
   *
   * @param {string} id the unique ID of the player
   * @param {string} name the name of the player
   * @param {string} strategy the key for the strategy implementation to
   * be used to make moves for the player
   */
  constructor(id, name, strategy) {
    super(id, name, strategy);
    this.colors = {};
    this.hand = [];
    this.gameStatus = GAME_STATUS.WAITING;
    this.boardState = new BoardState();
    this._shouldPrintResults = true;
  }

  /**
   * Updates the game status to either be `Current Turn` if the referee
   * is waiting on the player for action, or `Waiting` if the player's
   * turn is now over.
   *
   * @param {boolean} isCurrentTurn whether it's currently the player's turn
   */
  setTurnStatus(isCurrentTurn) {
    const gameStatus = isCurrentTurn ? GAME_STATUS.CURRENT_TURN : GAME_STATUS.WAITING;
    this.gameStatus = gameStatus;
  }

  /**
   * Updates the player's personal board state, and gives them
   * the most recent view of the board.
   *
   * @param {BoardState} boardState the new BoardState given by the referee
   */
  updateState(boardState) {
    this.boardState = boardState;
  }

  /**
   * Sets the player of the given ID's color to the referee-assigned color.
   *
   * @param {string} id the id of the player
   * @param {string} color the player's avatar's color
   */
  setColor(id, color) {
    this.colors[id] = color;
    // console.log(this.colors);
  }

  /**
   * Gets the player's avatar's color.
   *
   * @returns {string} the player's avatar's color
   */
  getColor() {
    return this.colors[this.id];
  }

  /**
   * Receives a hand given by the referee, and updated the current
   * player hand.
   *
   * @param {Tile[]} hand the new array (hand) of tiles
   */
  receiveHand(hand) {
    this.hand = hand;
  }

  /**
   * @async
   * Gets either a player's initial or intermediate action, as determined
   * by the strategy.
   *
   * @param {boolean} [isInitial=false] whether the action to retrieve
   * should be the player's initial action
   * @returns {InitialAction|IntermediateAction} the respective Action
   */
  async getAction(isInitial = false) {
    if (isInitial) {
      return this._getInitialAction();
    }
    return this._getIntermediateAction();
  }

  /**
   * @private
   * Gets the initial action of this player, as determined by the strategy,
   *
   * @returns {InitialAction} the player's initial action
   */
  _getInitialAction() {
    return this.strategy.getInitialAction(this.id, this.hand, this.boardState);
  }

  /**
   * @private
   * Gets the next intermediate action for the player, as determined by the strategy.
   *
   * @returns {IntermediateAction} the player's next action
   */
  _getIntermediateAction() {
    return this.strategy.getIntermediateAction(this.id, this.hand, this.boardState);
  }

  /**
   * Removes all tiles from the current hand.
   */
  clearHand() {
    this.hand = [];
  }

  /**
   * Informs the player that they have lost in the game.
   *
   * @param {boolean} forLegalMove whether the player lost for a legal move
   */
  // eslint-disable-next-line no-unused-vars
  lose(forLegalMove) {
    // TODO: stub
  }

  /**
   * Sets whether this player will print out who won their game at the end.
   * @param {Boolean} flag if the player should print
   */
  setPlayerPrintResultsStatus(flag) {
    this._shouldPrintResults = flag;
  }

  /**
   * Sets the `gameStatus` to `GameOver`. This signals to the player
   * that the game is now over, and which player(s) won.
   *
   * @param {string[][]} winners the player IDs of the winners of the game,
   * separated by winner place
   * @param {string[]} losers the player IDs of the losers of the game
   */
  endGame(winners, losers) {
    this.gameStatus = GAME_STATUS.GAME_OVER;
    if (this._shouldPrintResults) {
      console.log(winners, losers);
    }
  }
}

module.exports = Player;
