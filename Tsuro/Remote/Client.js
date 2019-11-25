const { Socket } = require('net');
const Player = require('../Player/Player');
const Message = require('../Common/message');
const { BoardState, SimpleTile } = require('../Common');
const { MESSAGE_ACTIONS } = require('../Common/utils/constants');

const CONN_ERRORS = {
  NO_SERVER_ACTIVE: 'ECONNREFUSED',
};

class Client {
  /**
   * @constructor
   * Creates a new Client to connect to a server at the given IP address
   * and port.
   *
   * @param {string} ipAddress the IP address of the server
   * @param {string} port the port of the server
   * @param {string} name the name of the client's player
   * @param {string} strategy the strategy that the client's player
   * should use
   */
  constructor(ipAddress, port, name, strategy) {
    this.ipAddress = ipAddress;
    this.port = port;
    this.client = null;

    this.name = name;
    this.strategy = strategy;
    this.player = new Player(name, name, strategy);

    this._hasGameEnded = false;

    this.handlers = {
      [MESSAGE_ACTIONS.SET_COLOR]: this._handleSetColor,
      [MESSAGE_ACTIONS.TURN_STATUS]: this._handleTurnStatus,
      [MESSAGE_ACTIONS.DEAL_HAND]: this._handleDealHand,
      [MESSAGE_ACTIONS.PROMPT_FOR_ACTION]: this._handlePromptForAction,
      [MESSAGE_ACTIONS.CLEAR_HAND]: this._handleClearHand,
      [MESSAGE_ACTIONS.REMOVE_PLAYER]: this._handleRemovePlayer,
      [MESSAGE_ACTIONS.UPDATE_STATE]: this._handleUpdateState,
      [MESSAGE_ACTIONS.GAME_OVER]: this._handleGameOver,
      [MESSAGE_ACTIONS.DENY_ENTRY]: this._handleDenyEntry,
      [MESSAGE_ACTIONS.INVALID_JSON]: this._handleInvalidJson,
      [MESSAGE_ACTIONS.UNKNOWN_ACTION]: this._handleUnknownAction,
    };

    this.errorHandlers = {
      [CONN_ERRORS.NO_SERVER_ACTIVE]: this._handleNoServerActive,
    };

    this._createClient();
    this._connectToServer();
  }

  /**
   * @private
   * Ends the client's session with the server, and exits the program.
   */
  _endSession() {
    this.client.destroy();
    process.exit(0);
  }

  /**
   * @private
   * Sends a message to the server, with the given action and payload.
   *
   * @param {string} action the action identifier of the message
   * @param {any} [payload] the payload of the message
   */
  _sendMessage(action, payload) {
    const message = new Message(action, payload);
    this.client.write(message.toString());
  }

  /**
   * @private
   * Helper function for logging errors to the client with the given
   * message and reason.
   *
   * @param {string} message the general title message, which could
   * cover a variety of reasons
   * @param {string} reason the specific reason why the error occurred
   */
  _logError(message, reason) {
    console.log(message);
    console.log(`REASON: ${reason}`);
  }

  /**
   * @private
   * Logs a error to the client, in which the game was ended
   * unexpectedly by the server.
   *
   * @param {string} reason the reason why the game ended
   */
  _logUnexpectedError(reason) {
    this._logError('The game has ended unexpectedly.', reason);
  }

  /**
   * @private
   * Logs a error to the client, in which the client was kicked from
   * the game.
   *
   * @param {string} reason the reason why the client was kicked
   */
  _logKickError(reason) {
    this._logError('You have been kicked from the game.', reason);
  }

  /**
   * @private
   * Handles the server sending the client an unknown action. Logs
   * the error to the client.
   */
  _handleInvalidJson() {
    this._logKickError('Invalid JSON.');
  }

  /**
   * @private
   * Handles the server sending the client an unknown action. Logs
   * the error to the client.
   */
  _handleUnknownAction() {
    this._logKickError('Unknown action.');
  }

  /**
   * @private
   * Handles the client being denied entry from the server. Logs
   * the error to the client.
   *
   * @param {string} payload the reason for being denied entry
   */
  _handleDenyEntry(payload) {
    this._logError('Entry to server denied.', payload);
  }

  /**
   * @private
   * Alerts the player that the game has ended, and who were the
   * winners and losers.
   *
   * @param {object} payload the winners and losers of the game
   * @param {string[][]} payload.winners the player IDs of the winners
   * of the game, separated by winner place
   * @param {string[]} payload.losers the player IDs of the losers of
   * the game
   */
  _handleGameOver(payload) {
    this._hasGameEnded = true;
    const { winners, losers } = payload;
    this.player.endGame(winners, losers);
  }

  /**
   * @private
   * Clears the player's hand.
   */
  _handleClearHand() {
    this.player.clearHand();
  }

  /**
   * @private
   * Updates the player's current turn status.
   *
   * @param {boolean} payload whether it's currently the player's
   * turn
   */
  _handleTurnStatus(payload) {
    this.player.setTurnStatus(payload);
  }

  /**
   * @private
   * Informs the player that they have lost.
   *
   * @param {boolean} payload whether the player lost from a
   * legal move or not
   */
  _handleRemovePlayer(payload) {
    this.player.lose(payload);
  }

  /**
   * @private
   * Updates the player's current board state from the server.
   *
   * @param {object} payload the JSON version of the board state
   * @param {string[][]} payload.tiles the 2D map of tiles, based
   * on tileIndices
   * @param {object[]} payload.avatars an array of JSON
   * representations of avatars
   * @param {object} payload.initialAvatarHashes the hash map for
   * initial avatar positions
   */
  _handleUpdateState(payload) {
    this.player.updateState(BoardState.fromJson(payload));
  }

  /**
   * @private
   * Receives a simple hand from the server, and parses the tile
   * indices to create tile objects to pass to the player.
   *
   * @param {string[]} payload the player's new hand, given via
   * tile indices
   */
  _handleDealHand(payload) {
    const hand = payload.map(tileIdx => new SimpleTile(tileIdx));
    this.player.receiveHand(hand);
  }

  /**
   * @private @async
   * Retrieves a new action for the player to make, as prompted by
   * the server. Then, sends a `SEND_ACTION` message to the server,
   * with a JSON-ified action.
   *
   * @param {boolean} payload whether the action to choose is initial
   * or not
   */
  async _handlePromptForAction(payload) {
    const action = await this.player.getAction(payload);
    this._sendMessage(MESSAGE_ACTIONS.SEND_ACTION, action.toJson());
  }

  /**
   * @private
   * Sets a player's color based on the given message payload.
   *
   * @param {object} payload the `SET_COLOR` message payload
   * @param {string} payload.id the ID of the player
   * @param {string} payload.color the color of the player
   */
  _handleSetColor(payload) {
    const { id, color } = payload;
    this.player.setColor(id, color);
  }

  /**
   * @private
   * Handles the given message from the server using the `handlers` object
   * to select the correct handler.
   *
   * If the message uses an unknown action, the client will end its session
   * with the server.
   *
   * @param {Message} message the message sent from the server
   */
  _handleMessage(message) {
    const { action, payload } = message;
    const handler = this.handlers[action];
    if (handler) {
      handler.bind(this)(payload);
    } else {
      this._logUnexpectedError(`The server has sent an unknown action (${action}).`);
      this._endSession();
    }
  }

  /**
   * @private
   * Event listener for the `data` event which listens for messages from
   * the server and handles them accordingly.
   *
   * If the message is malformed, the client will end its session with
   * the server.
   *
   * @param {Buffer} data the data buffer received, containing messages
   * from the server
   */
  _onServerData(data) {
    const text = data.toString().trim();
    try {
      text.split('\n').forEach(msgText => {
        const message = JSON.parse(msgText);
        this._handleMessage(message);
      });
    } catch (err) {
      this._logUnexpectedError('The server is sending malformed messages.');
      this._endSession();
    }
  }

  /**
   * @private
   * Event listener for the `end` event which ends the client's session
   * with the server. Will also log an unexpected server disconnect error
   * if such is the cause of the session end.
   */
  _onServerEnd() {
    if (!this._hasGameEnded) {
      this._logUnexpectedError('The server has gone down.');
    }
    this._endSession();
  }

  /**
   * @private
   * Handles the `ECONNREFUSE` error for when no server is available for
   * the client to connect to.
   */
  _handleNoServerActive() {
    this._handleDenyEntry(`No server is currently active at ${this.ipAddress}:${this.port}.`);
    this._endSession();
  }

  /**
   * @private
   * Event listener for the `error` event which uses the `errorHandlers`
   * object to handle server error events accordingly.
   *
   * @param {object} error the error encountered by the client
   */
  _onServerError(error) {
    const { code } = error;
    const handler = this.errorHandlers[code];
    if (handler) {
      handler.bind(this)();
    } else {
      this._logUnexpectedError(`Unknown error (${code}) has occurred.`);
      console.log(error);
    }
  }

  /**
   * @private
   * Registers the client as a player on the server. Sends a `REGISTER_CLIENT`
   * message to the server, with the client's ID and strategy as payload.
   */
  _register() {
    this._sendMessage(MESSAGE_ACTIONS.REGISTER_CLIENT, {
      id: this.name,
      strategy: this.strategy,
    });
  }

  /**
   * @private
   * Connects the client to the server at the given IP address and port.
   * Then, registers the client as player on the server.
   */
  _connectToServer() {
    this.client.connect(this.port, this.ipAddress, () => {
      this._register();
    });
  }

  /**
   * @private
   * Creates a new client and attaches all event handlers to it.
   */
  _createClient() {
    this.client = new Socket();
    this.client.on('data', this._onServerData.bind(this));
    this.client.on('end', this._onServerEnd.bind(this));
    this.client.on('error', this._onServerError.bind(this));
  }
}

module.exports = Client;
