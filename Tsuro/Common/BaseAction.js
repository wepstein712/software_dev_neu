const { Coords, SimpleTile } = require('.');

class BaseAction {
  /**
   * @constructor
   * Creates a new BaseAction with the given tile and coords.
   *
   * @param {Tile} tile the tile used in the action
   * @param {Coords} coords the coords used in the action
   */
  constructor(tile, coords) {
    this.tile = tile;
    this.coords = coords;
  }

  /**
   * Converts this BaseAction object into JSON to be sent over a TCP
   * server connection.
   *
   * @returns {object} a JSON-ified Action object
   */
  toJson() {
    return {
      tile: this.tile.index,
      coords: this.coords.toJson(),
    };
  }

  /**
   * @private @static
   * Converts the JSON payload into an object with the actual Tile and
   * Coords objects stored.
   *
   * @param {object} json the JSON-ified BaseAction object, as created by
   * the `toJson` method.
   * @returns {object} an object with the same structure of the
   * JSON-ified object, but with actual objects
   */
  static _convertJson(json) {
    const { tile, coords } = json;
    const aTile = new SimpleTile(tile);
    const aCoords = Coords.fromJson(coords);
    return {
      tile: aTile,
      coords: aCoords,
    };
  }

  /**
   * @static
   * Creates a new BaseAction object from the JSON-ified version.
   *
   * @param {object} json the JSON-ified BaseAction object, as created by
   * the `toJson` method.
   */
  static fromJson(json) {
    const { tile, coords } = this._convertJson(json);
    return new BaseAction(tile, coords);
  }
}

module.exports = BaseAction;
