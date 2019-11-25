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
  }

  _sendMessage(action, payload) {
    const message = new Message(action, payload);
    this.client.write(message.toString());
  }

  _logError(message, reason) {
    console.log(message);
    console.log(`REASON: ${reason}`);
  }

  _logUnexpectedError(payload) {
    this._logError('The game has ended unexpectedly.', payload);
  }

  _logKickError(payload) {
    this._logError('You have been kicked from the game.', payload);
  }

  _handleInvalidJson() {
    this._logKickError('Invalid JSON.');
  }

  _handleUnknownAction() {
    this._logKickError('Unknown action.');
  }

  _handleDenyEntry(payload) {
    this._logError('Entry to server denied.', payload);
  }

  _handleGameOver(payload) {
    this._hasGameEnded = true;
    const { winners, losers } = payload;
    this.player.endGame(winners, losers);
  }

  _handleClearHand() {
    this.player.clearHand();
  }

  _handleTurnStatus(payload) {
    this.player.setTurnStatus(payload);
  }

  _handleRemovePlayer(payload) {
    this.player.lose(payload);
  }

  _handleUpdateState(payload) {
    this.player.updateState(BoardState.fromJson(payload));
  }

  _handleDealHand(payload) {
    const hand = payload.map(tileIdx => new SimpleTile(tileIdx));
    this.player.receiveHand(hand);
  }

  async _handlePromptForAction(payload) {
    const action = await this.player.getAction(payload);
    this._sendMessage(MESSAGE_ACTIONS.SEND_ACTION, action.toJson());
  }

  _handleSetColor(payload) {
    const { id, color } = payload;
    this.player.setColor(id, color);
  }

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

  _endSession() {
    this.client.destroy();
    process.exit(0);
  }

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

  _onServerEnd() {
    if (!this._hasGameEnded) {
      this._logUnexpectedError('The server has gone down.');
    }
    this._endSession();
  }

  _handleNoServerActive() {
    this._handleDenyEntry(`No server is currently active at ${this.ipAddress}:${this.port}.`);
    this._endSession();
  }

  _onServerError(err) {
    const { code } = err;
    const handler = this.errorHandlers[code];
    if (handler) {
      handler.bind(this)();
    } else {
      this._logUnexpectedError(`Unknown error (${code}) has occurred.`);
      console.log(err);
    }
  }

  _register() {
    this._sendMessage(MESSAGE_ACTIONS.REGISTER_CLIENT, {
      id: this.name,
      strategy: this.strategy,
    });
  }

  _connectToServer() {
    this.client.connect(this.port, this.ipAddress, () => {
      this._register();
    });
  }

  _createClient() {
    this.client = new Socket();
    this.client.on('data', this._onServerData.bind(this));
    this.client.on('end', this._onServerEnd.bind(this));
    this.client.on('error', this._onServerError.bind(this));
    this._connectToServer();
  }
}

module.exports = Client;
