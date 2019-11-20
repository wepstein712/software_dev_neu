class Logger {
  constructor() {
    this.history = [];
  }

  get() {
    return this.history;
  }

  log(...message) {
    const msg = message.join(' ');
    this.history.push(msg);
    console.log(msg);
  }
}

module.exports = Logger;
