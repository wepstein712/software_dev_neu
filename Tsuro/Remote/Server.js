const { createServer } = require('net');
const Logger = require('./Logger');
const { Referee } = require('../Admin');
const ProxyPlayer = require('../Player/ProxyPlayer');
const { MESSAGE_ACTIONS } = require('../Common/utils/constants');
require('../Common/utils/polyfills');

// const MIN_PLAYER_SIZE = 3;
const SECOND = 1000;

class Server {
  constructor(ipAddress = '127.0.0.1', port = 8000) {
    this.logger = new Logger();
    this.ipAddress = ipAddress;
    this.port = port;
    this.clients = {};

    this.referee = new Referee();

    this.handlers = {
      [MESSAGE_ACTIONS.REGISTER_CLIENT]: this._handleRegisterClient,
    };

    this._standbyTimeout = null;
    this._hasGameStarted = false;
    this._createServer();
  }

  async _runGame() {
    this._hasGameStarted = true;
    await this.referee.runGame();
    Object.values(this.clients).forEach(({ client }) => {
      client.destroy();
    });
    process.exit(0);
  }

  _kickClient(client) {
    client.write('game has already started'); // TODO: change to message
    client.destroy();
  }

  _checkForGameStart(client) {
    const numClients = Object.keys(this.clients).length;
    if (numClients === 3) {
      this._standbyTimeout = setTimeout(() => {
        this._standbyTimeout = null;
        this._runGame();
      }, 30 * SECOND);
    } else if (numClients === 5 && this._standbyTimeout) {
      clearTimeout(this._standbyTimeout);
      this._runGame();
    } else if (numClients >= 5) {
      this._kickClient(client);
    }
  }

  /**
   *
   * @param {string} sessionId
   * @param {any} payload
   */
  _handleRegisterClient(sessionId, payload) {
    const { client } = this.clients[sessionId];
    const { id, strategy } = payload;

    const player = new ProxyPlayer(id, id, strategy, client);
    const color = this.referee.addPlayer(player);

    this.clients[sessionId].id = id;

    this.logger.log(id, '>>', 'create player', id, 'with strategy', strategy);
    this.logger.log(id, '<<', 'set color to', color);

    this._checkForGameStart(client);
  }

  _handleMessage(sessionId, message) {
    const { action, payload } = message;

    const handler = this.handlers[action];
    if (handler) {
      handler.bind(this)(sessionId, payload);
    } else {
      // TODO: send unknown action message
      console.log('DEFINITE unknown action');
    }
  }

  _onClientData(sessionId) {
    return data => {
      const text = data.toString().trim();
      try {
        text.split('\n').forEach(msgText => {
          const message = JSON.parse(msgText);
          this._handleMessage(sessionId, message);
        });
      } catch (err) {
        console.log(err);
        // TODO: send invalid JSON message
        console.log('invalid JSON');
      }
    };
  }

  _onClientEnd(sessionId) {
    return () => {
      this.referee.removePlayer(this.clients[sessionId].id, false);
      delete this.clients[sessionId];
    };
  }

  _getRandomSessionId() {
    return Math.random()
      .toString(36)
      .substr(2, 9);
  }

  _onClientConnect(client) {
    if (this._hasGameStarted) {
      this._kickClient(client);
    }
    const sessionId = this._getRandomSessionId();
    this.clients[sessionId] = {
      client,
      id: null,
    };

    client.once('data', this._onClientData(sessionId));
    client.on('end', this._onClientEnd(sessionId));
  }

  _createServer() {
    this.server = createServer(client => {
      this._onClientConnect(client);
    });
    this.server.listen(this.port, this.ipAddress);
  }
}

module.exports = Server;
