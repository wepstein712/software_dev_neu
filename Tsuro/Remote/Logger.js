class Logger {
  constructor() {
    this.history = [];
  }

  get() {
    return this.history;
  }

  _addMessage(message) {
    const msg = message.join(' ').trim();
    this.history.push(msg);
    console.log(msg);
  }

  debug(...message) {
    this._addMessage(['DEBUG:', ...message]);
  }

  log(id, ...message) {
    this._addMessage([id, ...message]);
  }
}

module.exports = Logger;
