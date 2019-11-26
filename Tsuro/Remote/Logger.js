const fs = require('fs');

class Logger {
  constructor(path) {
    this.path = path;
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

  write() {
    const data = this.get().join('\n');
    fs.writeFileSync(this.path, data);
  }
}

module.exports = Logger;
