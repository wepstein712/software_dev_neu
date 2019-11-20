const PlayerInterface = require('./PlayerInterface');
const Message = require('../Common/message');
const { Coords, InitialAction, IntermediateAction, Position, SimpleTile } = require('../Common');
const { MESSAGE_ACTIONS } = require('../Common/utils/constants');

class ProxyPlayer extends PlayerInterface {
  /**
   * Creates a new Player.
   *
   * @param {string} id the unique ID of the player
   * @param {string} name the name of the player
   * @param {string} strategy the key for the strategy implementation to
   * be used to make moves for the player
   */
  constructor(id, name, strategy, client) {
    super(id, name, strategy);
    this.color = null;
    this.hand = [];
    this.client = client;
  }

  _sendMessage(action, payload) {
    const message = new Message(action, payload);
    this.client.write(message.toString());
  }

  /**
   * Updates the game status to either be `Current Turn` if the referee
   * is waiting on the player for action, or `Waiting` if the player's
   * turn is now over.
   *
   * @param {boolean} isCurrentTurn whether it's currently the player's turn
   */
  setTurnStatus(isCurrentTurn) {
    this._sendMessage(MESSAGE_ACTIONS.TURN_STATUS, isCurrentTurn);
  }

  /**
   * Updates the player's personal board state, and gives them
   * the most recent view of the board.
   *
   * @param {BoardState} boardState the new BoardState given by the referee
   */
  updateState(boardState) {
    const json = boardState.toJson();
    this._sendMessage(MESSAGE_ACTIONS.UPDATE_STATE, json);
  }

  /**
   * Sets the player of the given ID's color to the referee-assigned color.
   *
   * @param {string} id the id of the player
   * @param {string} color the player's avatar's color
   */
  setColor(id, color) {
    if (this.id === id) {
      this.color = color;
    }
    this._sendMessage(MESSAGE_ACTIONS.SET_COLOR, { id, color });
  }

  /**
   * Gets the player's avatar's color.
   *
   * @returns {string} the player's avatar's color
   */
  getColor() {
    return this.color;
  }

  /**
   * Receives a hand given by the referee, and updated the current
   * player hand.
   *
   * @param {Tile[]} hand the new array (hand) of tiles
   */
  receiveHand(hand) {
    this.hand = hand;
    const handIndices = hand.map(tile => tile.index);
    this._sendMessage(MESSAGE_ACTIONS.DEAL_HAND, handIndices);
  }

  _getActionFromPayload(payload, isInitial) {
    const { tile, coords, position } = payload;
    const aTile = new SimpleTile(tile);
    const aCoords = new Coords(coords.x, coords.y);

    if (isInitial) {
      const aPosition = new Position(position.direction, position.port);
      return new InitialAction(aTile, aCoords, aPosition);
    }
    return new IntermediateAction(aTile, aCoords);
  }

  /**
   * Gets either a player's initial or intermediate action, as determined
   * by the strategy.
   *
   * @param {boolean} [isInitial=false] whether the action to retrieve
   * should be the player's initial action
   */
  getAction(isInitial = false) {
    return new Promise(resolve => {
      const onData = data => {
        const text = data.toString().trim();
        try {
          const message = JSON.parse(text.split('\n')[0]);
          console.log(this.id, message);
          const { action, payload } = message;
          if (action !== MESSAGE_ACTIONS.SEND_ACTION) {
            // TODO: resolve unknown action
            console.log('unknown action');
          } else {
            resolve(this._getActionFromPayload(payload, isInitial));
          }
        } catch (err) {
          // TODO: resolve invalid json
          console.log('invalid JSON');
        }
      };
      this.client.once('data', onData);
      this._sendMessage(MESSAGE_ACTIONS.PROMPT_FOR_ACTION, isInitial);
    });
  }

  /**
   * Removes all tiles from the current hand.
   */
  clearHand() {
    this.hand = [];
    this._sendMessage(MESSAGE_ACTIONS.CLEAR_HAND);
  }

  lose(forLegalMove) {
    this._sendMessage(MESSAGE_ACTIONS.REMOVE_PLAYER, forLegalMove);
  }

  /**
   * Sets the `gameStatus` to `GameOver`. This signals to the player
   * that the game is now over, and which player(s) won.
   *
   * @param {string[]} winners the player ID(s) of the winner(s)
   * of the game
   */
  endGame(winners, losers) {
    this._sendMessage(MESSAGE_ACTIONS.GAME_OVER, { winners, losers });
  }
}

module.exports = ProxyPlayer;
