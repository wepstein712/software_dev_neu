const { BaseAction, Position } = require('.');

class InitialAction extends BaseAction {
  /**
   * @constructor
   * Creates a new InitialAction with the given tile and coords.
   *
   * @param {Tile} tile the tile used in the action
   * @param {Coords} coords the coords used in the action
   * @param {Position} position the position used in the action
   */
  constructor(tile, coords, position) {
    super(tile, coords);
    this.position = position;
  }

  /**
   * Converts this InitialAction object into JSON to be sent over a TCP
   * server connection.
   *
   * @returns {object} a JSON-ified InitialAction object
   */
  toJson() {
    const json = super.toJson();
    const position = this.position.toJson();
    return Object.assign(json, { position });
  }

  /**
   * @private @static
   * Converts the JSON payload into an object with the actual
   * Tile, Coords, and Position objects stored.
   *
   * @param {object} json the JSON-ified InitialAction object, as
   * created by the `toJson` method.
   * @returns {object} an object with the same structure of the
   * JSON-ified object, but with actual objects
   */
  static _convertJson(json) {
    const { position, ...restJson } = json;

    const convertedPayload = super._convertJson(restJson);
    const aPosition = Position.fromJson(position);

    return Object.assign(convertedPayload, {
      position: aPosition,
    });
  }

  /**
   * @static
   * Creates a new InitialAction object from the JSON-ified version.
   *
   * @param {object} json the JSON-ified InitialAction object, as
   * created by the `toJson` method.
   */
  static fromJson(payload) {
    const { tile, coords, position } = this._convertJson(payload);
    return new InitialAction(tile, coords, position);
  }
}

module.exports = InitialAction;
