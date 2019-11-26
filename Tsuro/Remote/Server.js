const { createServer } = require('net');
const Logger = require('./Logger');
const Validation = require('./Validation');
const { Referee } = require('../Admin');
const ProxyPlayer = require('../Player/ProxyPlayer');
const Message = require('../Common/message');
const { DEFAULT_CONN, MESSAGE_ACTIONS } = require('../Common/utils/constants');
require('../Common/utils/polyfills');

const MIN_PLAYER_SIZE = 3;
const MAX_PLAYER_SIZE = 5;

const SECOND = 1000;
const EXIT_TIMEOUT = 10;
const STANDBY_TIMEOUT = 2 * SECOND;

const CONN_ERRORS = {
  CLIENT_DISCONNECTED: 'EPIPE',
};

class Server {
  /**
   * @constructor
   * Creates a new server at the given IP address and port.
   *
   * @param {string} [ipAddress='127.0.0.1'] the IP address to create
   * the server at
   * @param {number} [port=8000] the port to host the server at
   */
  constructor(ipAddress = DEFAULT_CONN.IP_ADDRESS, port = DEFAULT_CONN.PORT) {
    this.ipAddress = ipAddress;
    this.port = port;
    this.server = null;
    this.clients = {};

    this.logger = new Logger();
    this.referee = new Referee(this.logger);

    this._standbyTimeout = null;
    this._hasGameStarted = false;

    this.handlers = {
      [MESSAGE_ACTIONS.REGISTER_CLIENT]: this._handleRegisterClient,
    };

    this.errorHandlers = {
      [CONN_ERRORS.CLIENT_DISCONNECTED]: this._handleClientDisconnect,
    };

    this._createServer();
  }

  _getIdFromSession(sessionId) {
    let id = 'ANON_CLIENT';
    const session = this.clients[sessionId];
    if (session) {
      id = session.id || id;
    }
    return id;
  }

  /**
   * @private @async
   * Runs the referee's game. Once the game has ended, it will destroy all
   * connected clients, then close the server.
   */
  async _runGame() {
    this._standbyTimeout = null;
    this._hasGameStarted = true;
    this.logger.debug('Game has started.');
    await this.referee.runGame();
    this.logger.debug('Game has ended.');
    setTimeout(() => {
      Object.values(this.clients).forEach(({ client }) => {
        client.destroy();
      });
      process.exit(0);
    }, EXIT_TIMEOUT);
  }

  /**
   * @private
   * Toggles the game standby timeout.
   *
   * @param {boolean} toggle begins the standby timeout if true; otherwise,
   * cancels the timeout and sets it to null
   */
  _toggleTimeout(toggle) {
    if (toggle) {
      this._standbyTimeout = setTimeout(() => {
        this._runGame();
      }, STANDBY_TIMEOUT);
      this.logger.debug('Standby timeout has started.');
    } else if (this._standbyTimeout) {
      clearTimeout(this._standbyTimeout);
      this._standbyTimeout = null;
      this.logger.debug('Standby timeout has ended.');
    }
  }

  /**
   * @private
   * Checks whether the game is able to start; that is, whether the minimum
   * amount of players has been met.
   *
   * If the minimum is just met, it will begin the standby timeout for the
   * game to start.
   *
   * If the maximum is met and the timeout is running, it will cancel the
   * timeout and immediately start the game.
   */
  _checkForGameStart() {
    const numPlayers = this.referee.getPlayers().length;
    if (numPlayers === MIN_PLAYER_SIZE) {
      this._toggleTimeout(true);
    } else if (numPlayers === MAX_PLAYER_SIZE && this._standbyTimeout) {
      this._toggleTimeout(false);
      this._runGame();
    }
  }

  /**
   * @private
   * Sends the client a message with the given action (and optional payload),
   * then destroys the client.
   *
   * @param {net.Socket} client the socket client to destroy
   * @param {string} action the action of the kick message
   * @param {any} [payload] the payload of the kick message
   * @param {string} [sessionId]
   */
  _kickClient(client, action, payload, sessionId) {
    const message = new Message(action, payload);
    const stringMessage = message.toString();

    client.write(stringMessage);
    this.logger.log(this._getIdFromSession(sessionId), '<<', stringMessage);

    setTimeout(() => {
      client.destroy();
    }, EXIT_TIMEOUT);
  }

  /**
   * @private
   * Removes a client of the given session ID. If an action (and optional
   * payload) is passed, the client will be sent that message and
   * then destroyed.
   *
   * @param {string} sessionId the ID of the client's session
   * @param {string} [action] the action of the kick message
   * @param {any} [payload] the payload of the kick message
   * @returns {string|null} the ID of the client's player, or null if the
   * client didn't have a player yet
   */
  _removeClient(sessionId, action, payload) {
    const session = this.clients[sessionId];
    if (session) {
      const { client, id } = session;
      this.referee.removePlayer(id, false, true);
      if (this.referee.getPlayers().length < MIN_PLAYER_SIZE) {
        this._toggleTimeout(false);
      }

      if (action) {
        this._kickClient(client, action, payload, sessionId);
      }

      delete this.clients[sessionId];
      return id;
    }
    return null;
  }

  /**
   * @private
   * Ends a client session of the given ID, then logs the associated
   * player has been kicked.
   *
   * @param {string} sessionId the ID of the client's session
   * @param {string} [action] the action of the kick message
   * @param {any} [payload] the payload of the kick message
   */
  _endClientSession(sessionId, action, payload) {
    const id = this._removeClient(sessionId, action, payload);
    if (id) {
      this.logger.debug(id, 'has been kicked.');
    }
  }

  /**
   * @private
   * Returns a callback function for a ProxyPlayer in order to kick
   * their given client from the server.
   *
   * @param {string} sessionId the session ID for the ProxyPlayer's
   * client
   * @returns {function} a callback function that, given a message
   * action and payload, will kick the client from the server
   */
  _getKickCallback(sessionId) {
    return (action, payload) => this._endClientSession(sessionId, action, payload);
  }

  /**
   * @private
   * Handles the `REGISTER_CLIENT` action. Creates a new proxy player
   * for the client with the given session ID, and adds the player to
   * the referee's game. Then, checks if the game is able to start.
   *
   * @param {string} sessionId the ID of the client's session
   * @param {object} payload the payload of the message
   * @param {string} payload.id the desired ID of the client's player
   * @param {string} payload.strategy the desired strategy of the
   * client's player
   */
  _handleRegisterClient(sessionId, payload) {
    const { client } = this.clients[sessionId];
    const { id, strategy } = payload;

    if (!Validation.testName(id)) {
      this._endClientSession(sessionId, MESSAGE_ACTIONS.INVALID_ID, 'Alphanumeric names only.');
    } else if (!Validation.testStrategy(strategy)) {
      this._endClientSession(sessionId, MESSAGE_ACTIONS.UNKNOWN_STRAT, 'Strategy does not exist.');
    } else {
      const uniqueId = `${id}#${sessionId}`;
      const player = new ProxyPlayer(
        uniqueId,
        uniqueId,
        strategy,
        client,
        this._getKickCallback(sessionId),
        this.logger
      );
      this.referee.addPlayer(player);

      this.clients[sessionId].id = uniqueId;

      this._checkForGameStart();
    }
  }

  /**
   * @private
   * Handles messages from the client with the given session ID. Uses
   * the `handlers` object to select the correct handler for the
   * given message, then runs the respective action.
   *
   * If no handler is found, the client will be kicked with an
   * `UNKNOWN_ACTION` message.
   *
   * @param {string} sessionId the session ID of the client
   * @param {Message} message the message sent from the client
   */
  _handleMessage(sessionId, message) {
    const { action, payload } = message;

    this.logger.log(
      this._getIdFromSession(sessionId),
      '>>',
      new Message(action, payload).toString()
    );
    const handler = this.handlers[action];
    if (handler) {
      handler.bind(this)(sessionId, payload);
    } else {
      this._endClientSession(sessionId, MESSAGE_ACTIONS.UNKNOWN_ACTION);
    }
  }

  /**
   * @private
   * Event listener factory for the `data` event. This will create a
   * `data` event listener for the client that parses data and handles
   * messages accordingly.
   *
   * If an invalid JSON message is passed, the client will be kicked
   * with an `INVALID_JSON` message.
   *
   * @param {string} sessionId the session ID of the client
   * @returns {function} `data` event listener for the session client
   */
  _onClientData(sessionId) {
    return data => {
      const text = data.toString().trim();
      try {
        text.split('\n').forEach(msgText => {
          const message = JSON.parse(msgText);
          this._handleMessage(sessionId, message);
        });
      } catch (err) {
        this._endClientSession(sessionId, MESSAGE_ACTIONS.INVALID_JSON);
      }
    };
  }

  /**
   * @private
   * Event listener factory for the `end` event. This will create an
   * `end` event listener for the client that removes the client from
   * the referee's game when the client ends.
   *
   * @param {string} sessionId the session ID of the client
   * @returns {function} `end` event listener for the session client
   */
  _onClientEnd(sessionId) {
    return () => {
      const id = this._removeClient(sessionId);
      if (id) {
        this.logger.debug(id, 'has disconnected.');
      }
    };
  }

  /**
   * @private
   * Handles the `EPIPE` error for when clients disconnect from the
   * server unexpectedly.
   *
   * @param {string} sessionId the session ID of the client
   */
  _handleClientDisconnect(sessionId) {
    this._onClientEnd(sessionId)();
  }

  /**
   * @private
   * Event listener factory for the `error` event. This will create an
   * `error` event listener for the client that uses the `errorHandlers`
   * object to handle error events accordingly.
   *
   * @param {string} sessionId the session ID of the client
   * @returns {function} `error` event listener for the session client
   */
  _onClientError(sessionId) {
    return err => {
      const { code } = err;
      const handler = this.errorHandlers[code];
      if (handler) {
        handler.bind(this)(sessionId);
      } else {
        // TODO: handle unknown error
        console.log('Unknown error code');
        console.log(err);
      }
    };
  }

  /**
   * @private
   * Gets a unique session ID for a new client.
   *
   * @returns {string} the client's unique session ID
   */
  _getUniqueSessionId() {
    let sessionId;

    do {
      sessionId = Math.random()
        .toString(36)
        .substr(2, 9);
    } while (this.clients[sessionId]);

    return sessionId;
  }

  /**
   * @private
   * Handles connecting to a new client.
   *
   * If the game has already started, the client will be kicked
   * with reason `DENY_ENTRY`.
   *
   * Otherwise, this will create a new client entry in the `clients`
   * map and attach the client event listeners.
   *
   * @param {net.Socket} client the client connecting to this server
   */
  _onClientConnect(client) {
    if (this._hasGameStarted) {
      return this._kickClient(client, MESSAGE_ACTIONS.DENY_ENTRY, 'Game has already begun.');
    }
    const sessionId = this._getUniqueSessionId();
    this.clients[sessionId] = {
      client,
      id: null,
    };

    client.once('data', this._onClientData(sessionId));
    client.on('end', this._onClientEnd(sessionId));
    client.on('error', this._onClientError(sessionId));
  }

  /**
   * @private
   * Creates a new server at the IP address and port.
   */
  _createServer() {
    this.server = createServer(this._onClientConnect.bind(this));
    this.server.listen(this.port, this.ipAddress);
    this.logger.debug('Create server at', `${this.ipAddress}:${this.port}`);
  }
}

module.exports = Server;
