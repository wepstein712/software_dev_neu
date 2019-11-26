const getArgs = require('./getArgs');
const { Client } = require('../../Remote');

const main = () => {
  try {
    const [ipAddress, port, name, strategy] = getArgs();
    if (!ipAddress) {
      throw 'IP address is required.';
    } else if (!port) {
      throw 'Port is required.';
    } else if (!name) {
      throw 'Name is required.';
    } else if (!strategy) {
      throw 'Strategy is required.';
    }
    new Client(ipAddress, port, name, strategy);
  } catch (err) {
    console.log(err);
    process.exit(0);
  }
};

main();
