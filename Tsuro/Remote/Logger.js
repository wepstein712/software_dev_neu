const fs = require('fs');

class Logger {
  /**
   * @constructor
   * Creates a new Logger for the given path.
   *
   * @param {string} path the path to create the final
   * `xserver.log` file at
   */
  constructor(path) {
    this.path = path;
    this._history = [];
  }

  /**
   * Retrieves the logger's history.
   *
   * @returns {string[]} the logger's history
   */
  get() {
    return this._history;
  }

  /**
   * @private
   * Adds a message to the Logger history.
   *
   * @param {string[]} message an array of strings to join
   * as a single message
   */
  _addMessage(message) {
    const msg = message.join(' ').trim();
    this._history.push(msg);
    console.log(msg);
  }

  /**
   * Logs a debug message for actions done only on the server.
   *
   * @param  {...string} message the message to log
   */
  debug(...message) {
    this._addMessage(['DEBUG:', ...message]);
  }

  /**
   * Logs a message sent from the player to the server.
   *
   * @param {string} id the ID of the player
   * @param  {...string} message the message to log
   */
  logFrom(id, ...message) {
    this._addMessage([id, '>>', ...message]);
  }

  /**
   * Logs a message sent from the server to the player.
   *
   * @param {string} id the ID of the player
   * @param  {...string} message the message to log
   */
  logTo(id, ...message) {
    this._addMessage([id, '<<', ...message]);
  }

  /**
   * Writes the current history to the Logger's path.
   */
  write() {
    const data = this.get().join('\n');
    fs.writeFileSync(this.path, data);
  }
}

module.exports = Logger;
