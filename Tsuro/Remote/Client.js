const { Socket } = require('net');
const Message = require('../Common/message');
const { MESSAGE_ACTIONS } = require('../Common/utils/constants');

class Client {
  /**
   *
   * @param {*} ipAddress
   * @param {*} port
   * @param {*} name
   * @param {string} strategy
   */
  constructor(ipAddress, port, name, strategy) {
    this.ipAddress = ipAddress;
    this.port = port;
    this.name = name;
    this.strategy = strategy;

    this.handlers = {
      [MESSAGE_ACTIONS.SET_COLOR]: this._handleSetColor.bind(this),
    };

    this._createClient();
  }

  _handleSetColor(payload) {
    console.log(payload);
  }

  _handleMessage(message) {
    const { action, payload } = message;

    const handler = this.handlers[action];
    if (handler) {
      handler(payload);
    } else {
      console.log('unknown action');
    }
  }

  _onServerData() {
    return data => {
      const text = data.toString().trim();
      try {
        const message = JSON.parse(text);
        this._handleMessage(message);
      } catch (err) {
        // TODO: send invalid JSON message
        console.log('invalid JSON');
      }
    };
  }

  _onServerEnd() {
    return () => {
      this.client.destroy();
      process.exit(0);
    };
  }

  _register() {
    const msg = new Message(MESSAGE_ACTIONS.REGISTER_CLIENT, {
      id: this.name,
      strategy: this.strategy,
    });
    this.client.write(msg.toString());
  }

  _connectToServer() {
    this.client.connect(this.port, this.ipAddress, () => {
      this._register();
    });
  }

  _createClient() {
    this.client = new Socket();
    this.client.on('data', this._onServerData());
    this.client.on('end', this._onServerEnd());
    this._connectToServer();
  }
}

module.exports = Client;
