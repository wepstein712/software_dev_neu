class Message {
  /**
   * @constructor
   * Creates a new message with the given action and payload.
   *
   * @param {string} action the unique message identifier
   * @param {any} [payload=null] the payload of the message to send
   */
  constructor(action, payload = null) {
    this.action = action;
    this.payload = payload;
  }

  /**
   * Stringifies the message to send to the server
   * or client.
   *
   * @returns {string} the stringified message
   */
  toString() {
    const message = JSON.stringify({
      action: this.action,
      payload: this.payload,
    });
    return `${message}\n`;
  }
}

module.exports = Message;
