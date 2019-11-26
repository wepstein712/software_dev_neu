const getArgs = require('./getArgs');
const { Client } = require('../../Remote');

const main = () => {
  const [ipAddress, port, name, strategy] = getArgs();
  new Client(ipAddress, port, name, strategy);
};

main();
