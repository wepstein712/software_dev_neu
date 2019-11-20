const Tile = require('./tiles');
const { tiles } = require('./__tests__');
const { getTileFromLetters } = require('./utils');

class SimpleTile extends Tile {
  constructor(index) {
    super([]);

    if (index < 0 || index >= tiles.length) {
      throw 'Invalid tile index';
    }
    const tile = getTileFromLetters(tiles[index]);

    this.paths = tile.paths;
    this.index = index;
  }

  copy() {
    const copy = super.copy();
    copy.index = this.index;
    return copy;
  }
}

module.exports = SimpleTile;
