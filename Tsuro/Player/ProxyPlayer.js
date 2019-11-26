const BasePlayer = require('./BasePlayer');
const Message = require('../Common/message');
const { InitialAction, IntermediateAction } = require('../Common');
const { MESSAGE_ACTIONS } = require('../Common/utils/constants');

class ProxyPlayer extends BasePlayer {
  /**
   * @constructor
   * Creates a new ProxyPlayer to be used to communicate between the
   * server and the given client.
   *
   * @param {string} id the unique ID of the player
   * @param {string} name the name of the player
   * @param {string} strategy the key for the strategy implementation to
   * be used to make moves for the player
   * @param {net.Socket} client the player's corresponding client
   * @param {function} kickClient a callback function used to kick the
   * client from the server
   * @param {Logger} logger the server's logger to include new messages
   */
  constructor(id, name, strategy, client, kickClient, logger) {
    super(id, name, strategy);
    this.color = null;
    this.hand = [];

    this._client = client;
    this._kickClient = kickClient;
    this._wasKicked = false;

    this.logger = logger;

    this._sendMessage(MESSAGE_ACTIONS.SET_UNIQUE_NAME, name);
  }

  /**
   * @private
   * Kicks the client from the server, using the `kickClient` callback function
   * passed in the constructor. Marks the player as kicked to prevent further
   * messages from being sent.
   *
   * @param {string} action the action identifier for the kick message
   * @param {any} [payload] the payload of the kick message
   */
  _kick(action, payload) {
    if (!this._wasKicked) {
      this._kickClient(action, payload);
      this._wasKicked = true;
    }
  }

  /**
   * @private
   * Helper function for sending messages to the client. This will not send
   * messages to clients that have been kicked.
   *
   * @param {string} action the action identifier for the message
   * @param {any} [payload] the payload of the message
   */
  _sendMessage(action, payload) {
    if (!this._wasKicked) {
      const message = new Message(action, payload);
      const stringMessage = message.toString();

      this._client.write(stringMessage);
      this.logger.logTo(this.id, stringMessage);
    }
  }

  /**
   * Sends the client a `TURN_STATUS` message, with the current turn status
   * as payload.
   *
   * @param {boolean} isCurrentTurn whether it's currently the player's turn
   */
  setTurnStatus(isCurrentTurn) {
    this._sendMessage(MESSAGE_ACTIONS.TURN_STATUS, isCurrentTurn);
  }

  /**
   * Updates the player's personal board state, and gives them the most recent
   * view of the board. Sends the client an `UPDATE_STATE` message, with the
   * JSON representation of the state as payload.
   *
   * @param {BoardState} boardState the new BoardState given by the referee
   */
  updateState(boardState) {
    const json = boardState.toJson();
    this._sendMessage(MESSAGE_ACTIONS.UPDATE_STATE, json);
  }

  /**
   * Sets the player of the given ID's color to the referee-assigned color.
   * Sends the client a `SET_COLOR` message, with the id and color as payload.
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
   * Receives a hand given by the referee, and updates the current player hand.
   * Sends the client a `DEAL_HAND` message, with the tileIndices of the hand
   * as payload.
   *
   * @param {SimpleTile[]} hand the new array (hand) of tiles
   */
  receiveHand(hand) {
    this.hand = hand;
    const handIndices = hand.map(tile => tile.index);
    this._sendMessage(MESSAGE_ACTIONS.DEAL_HAND, handIndices);
  }

  /**
   * @private
   * Converts a given payload from JSON to the respective Action object.
   *
   * @param {object} payload the payload of the client's message
   * @param {boolean} isInitial whether the action in the payload is an
   * initial action
   * @returns {InitialAction|IntermediateAction} the respective Action
   */
  _getActionFromPayload(payload, isInitial) {
    if (isInitial) {
      return InitialAction.fromJson(payload);
    }
    return IntermediateAction.fromJson(payload);
  }

  /**
   * @async
   * Sends the client a `PROMPT_FOR_ACTION` message, with whether the
   * action is initial as payload. Then, opens a one-time `data` event
   * handler for receiving the player's respective action.
   *
   * If the message received is malformed JSON or uses an unknown
   * message action, the player's client will be kicked and removed
   * from game and error will be thrown.
   *
   * @param {boolean} [isInitial=false] whether the action to retrieve
   * should be the player's initial action
   * @returns {BaseAction} the player's desired action
   */
  async getAction(isInitial = false) {
    try {
      const action = await new Promise((resolve, reject) => {
        const onData = data => {
          const text = data.toString().trim();
          try {
            const message = JSON.parse(text.split('\n')[0]);
            const { action, payload } = message;
            if (action !== MESSAGE_ACTIONS.SEND_ACTION) {
              reject(MESSAGE_ACTIONS.UNKNOWN_ACTION);
            } else {
              this.logger.logFrom(this.id, new Message(action, payload).toString());
              resolve(this._getActionFromPayload(payload, isInitial));
            }
          } catch (err) {
            reject(MESSAGE_ACTIONS.INVALID_JSON);
          }
        };
        this._client.once('data', onData);
        // TODO: maybe add end listener too?
        // this._client.on('end', () => {
        //   console.log('disconnected');
        // });
        this._sendMessage(MESSAGE_ACTIONS.PROMPT_FOR_ACTION, isInitial);
      });
      return action;
    } catch (messageAction) {
      this._kick(messageAction);
      throw 'Client kicked';
    }
  }

  /**
   * Removes all tiles from the current hand. Send the client a
   * `CLEAR_HAND` message.
   */
  clearHand() {
    this.hand = [];
    this._sendMessage(MESSAGE_ACTIONS.CLEAR_HAND);
  }

  /**
   * Send the client a `REMOVE_PLAYER` message, with the move legality
   * as payload.
   *
   * @param {boolean} forLegalMove whether the player lost for a legal
   * move
   */
  lose(forLegalMove) {
    this._sendMessage(MESSAGE_ACTIONS.REMOVE_PLAYER, forLegalMove);
  }

  /**
   * Sends the client a `GAME_OVER` message, with the given winners
   * and losers as payload.
   *
   * @param {string[][]} winners the player IDs of the winners of the game,
   * separated by winner place
   * @param {string[]} losers the player IDs of the losers of the game
   */
  endGame(winners, losers) {
    this._sendMessage(MESSAGE_ACTIONS.GAME_OVER, { winners, losers });
  }
}

module.exports = ProxyPlayer;
