const { BaseAction } = require('.');

class IntermediateAction extends BaseAction {
  /**
   * @static
   * Creates a new IntermediateAction object from the JSON-ified version.
   *
   * @param {object} json the JSON-ified IntermediateAction object, as
   * created by the `toJson` method.
   */
  static fromJson(payload) {
    const { tile, coords } = this._convertJson(payload);
    return new IntermediateAction(tile, coords);
  }
}

module.exports = IntermediateAction;
