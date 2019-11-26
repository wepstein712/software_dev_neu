const Tile = require('./tiles');
const { tiles } = require('./__tests__');
const { getTileFromLetters } = require('./utils');

class SimpleTile extends Tile {
  /**
   * @constructor
   * Creates a new tile based on the given tile index.
   *
   * @param {number} index the index of the tile to create
   */
  constructor(index) {
    super([]);

    if (index < 0 || index >= tiles.length) {
      throw 'Invalid tile index';
    }
    const tile = getTileFromLetters(tiles[index]);

    this.paths = tile.paths;
    this.index = index;
  }

  /**
   * Creates a new copy of this Tile.
   *
   * @returns {SimpleTile} a copy of this Tile
   */
  copy() {
    const copy = super.copy();
    copy.index = this.index;
    return copy;
  }
}

module.exports = SimpleTile;
