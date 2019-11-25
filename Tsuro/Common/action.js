const { Coords, Position, SimpleTile } = require('.');

class Action {
  /**
   *
   * @param {Tile} tile
   * @param {Coords} coords
   */
  constructor(tile, coords) {
    this.tile = tile;
    this.coords = coords;
  }

  toJson() {
    return {
      tile: this.tile.index,
      coords: this.coords.toJson(),
    };
  }

  static _convertPayload(payload) {
    const { tile, coords } = payload;
    const aTile = new SimpleTile(tile);
    const aCoords = Coords.fromJson(coords);
    return {
      tile: aTile,
      coords: aCoords,
    };
  }

  static fromJson(payload) {
    const { tile, coords } = this._convertPayload(payload);
    return new Action(tile, coords);
  }
}

class InitialAction extends Action {
  /**
   *
   * @param {Tile} tile
   * @param {Coords} coords
   * @param {Position} position
   */
  constructor(tile, coords, position) {
    super(tile, coords);
    this.position = position;
  }

  toJson() {
    const json = super.toJson();
    return Object.assign(json, { position: this.position.toJson() });
  }

  static _convertPayload(payload) {
    const { position, ...restPayload } = payload;

    const convertedPayload = super._convertPayload(restPayload);
    const aPosition = Position.fromJson(position);

    return Object.assign(convertedPayload, {
      position: aPosition,
    });
  }

  static fromJson(payload) {
    const { tile, coords, position } = this._convertPayload(payload);
    return new InitialAction(tile, coords, position);
  }
}

class IntermediateAction extends Action {
  static fromJson(payload) {
    const { tile, coords } = this._convertPayload(payload);
    return new IntermediateAction(tile, coords);
  }
}

exports.InitialAction = InitialAction;
exports.IntermediateAction = IntermediateAction;
