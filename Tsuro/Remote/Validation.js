const { STRATEGIES } = require('../Common/utils/constants');

class Validation {
  /**
   * Validates whether the given name is alphanumeric.
   *
   * @param {string} name the name to test
   * @returns {boolean} whether the name is alphanumeric
   */
  static testName(name) {
    const alphaNumericTest = new RegExp(/^[a-zA-Z0-9_]*$/g);
    return alphaNumericTest.test(name);
  }

  /**
   * Validates whether the given strategy exists.
   *
   * @param {string} strategy the strategy to test
   * @returns {boolean} whether the strategy exists
   */
  static testStrategy(strategy) {
    return Object.values(STRATEGIES).some(
      key => key.toLocaleLowerCase() === strategy.toLocaleLowerCase()
    );
  }
}

module.exports = Validation;
