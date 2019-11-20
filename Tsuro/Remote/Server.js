const { createServer } = require('net');
const Logger = require('./Logger');
const { Referee } = require('../Admin');
const Player = require('../Player/Player');
const Message = require('../Common/message');
const { MESSAGE_ACTIONS } = require('../Common/utils/constants');

// const MIN_PLAYER_SIZE = 3;

class Server {
  constructor(ipAddress = '127.0.0.1', port = 8000) {
    this.logger = new Logger();
    this.ipAddress = ipAddress;
    this.port = port;
    this.clients = {};

    this.referee = new Referee();

    this.handlers = {
      [MESSAGE_ACTIONS.REGISTER_CLIENT]: this._handleRegisterClient.bind(this),
    };

    this._createServer();
  }

  _handleRegisterClient(client, payload) {
    const { id, strategy } = payload;
    this.logger.log(id, '>>', 'create player', id, 'with strategy', strategy);

    // TODO: make strategy (case-insensitive) string into actual strategy
    const player = new Player(id, id, strategy);
    this.referee.addPlayer(player);
    const color = player.getColor();

    const message = new Message(MESSAGE_ACTIONS.SET_COLOR, color);
    client.write(message.toString());
    this.logger.log(id, '<<', 'set color to', color);
  }

  _handleMessage(client, message) {
    const { action, payload } = message;

    const handler = this.handlers[action];
    if (handler) {
      handler(client, payload);
    } else {
      // TODO: send unknown action message
      console.log('unknown action');
    }
  }

  _onClientData(sessionId) {
    const { client } = this.clients[sessionId];
    return data => {
      const text = data.toString().trim();
      try {
        const message = JSON.parse(text);
        this._handleMessage(client, message);
      } catch (err) {
        console.log(err);
        // TODO: send invalid JSON message
        console.log('invalid JSON');
      }
    };
  }

  _onClientEnd(sessionId) {
    return () => {
      delete this.clients[sessionId];
      console.log(sessionId, '>>', 'DELETED');
    };
  }

  _getRandomSessionId() {
    return Math.random()
      .toString(36)
      .substr(2, 9);
  }

  _onClientConnect(client) {
    const sessionId = this._getRandomSessionId();
    this.clients[sessionId] = {
      client,
      id: null,
      strategy: null,
    };

    client.on('data', this._onClientData(sessionId));
    client.on('end', this._onClientEnd(sessionId));

    console.log(sessionId, '>>', 'CONNECTED');
  }

  _createServer() {
    this.server = createServer(client => {
      this._onClientConnect(client);
    });
    this.server.listen(this.port, this.ipAddress);
  }
}

module.exports = Server;
