const { Socket } = require('net');
const Player = require('../Player/Player');
const Message = require('../Common/message');
const { Avatar, BoardState, Coords, Position, SimpleTile } = require('../Common');
const { MESSAGE_ACTIONS } = require('../Common/utils/constants');

class Client {
  /**
   *
   * @param {string} ipAddress
   * @param {string} port
   * @param {string} name
   * @param {string} strategy
   */
  constructor(ipAddress, port, name, strategy) {
    this.ipAddress = ipAddress;
    this.port = port;
    this.name = name;
    this.strategy = strategy;

    this.player = new Player(name, name, strategy);

    this.handlers = {
      [MESSAGE_ACTIONS.SET_COLOR]: this._handleSetColor,
      [MESSAGE_ACTIONS.TURN_STATUS]: this._handleTurnStatus,
      [MESSAGE_ACTIONS.DEAL_HAND]: this._handleDealHand,
      [MESSAGE_ACTIONS.PROMPT_FOR_ACTION]: this._handlePromptForAction,
      [MESSAGE_ACTIONS.CLEAR_HAND]: this._handleClearHand,
      [MESSAGE_ACTIONS.REMOVE_PLAYER]: this._handleRemovePlayer,
      [MESSAGE_ACTIONS.UPDATE_STATE]: this._handleUpdateState,
      [MESSAGE_ACTIONS.GAME_OVER]: this._handleGameOver,
    };

    this._createClient();
  }

  _sendMessage(action, payload) {
    const message = new Message(action, payload);
    this.client.write(message.toString());
  }

  _handleGameOver(payload) {
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
    const { tiles, avatars, initialAvatarHashes } = payload;
    const bsTiles = tiles.map(row => row.map(tile => (tile ? new SimpleTile(tile) : null)));
    const bsAvatars = avatars.reduce((acc, { id, color, coords, position, collided, exited }) => {
      const avatar = new Avatar(
        id,
        color,
        new Coords(coords.x, coords.y),
        new Position(position.direction, position.port),
        collided,
        exited
      );
      return Object.assign(acc, {
        [id]: avatar,
      });
    }, {});
    const newState = {
      _tiles: bsTiles,
      _avatars: bsAvatars,
      _initialAvatarHashed: initialAvatarHashes,
    };
    this.player.updateState(new BoardState(newState));
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
      console.log('unknown action');
    }
  }

  _onServerData() {
    return data => {
      const text = data.toString().trim();
      try {
        text.split('\n').forEach(msgText => {
          const message = JSON.parse(msgText);
          this._handleMessage(message);
        });
      } catch (err) {
        console.log(err);
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
    this.client.on('data', this._onServerData());
    this.client.on('end', this._onServerEnd());
    this._connectToServer();
  }
}

module.exports = Client;
