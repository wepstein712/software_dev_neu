const getArgs = require('./getArgs');
const { Server } = require('../../Remote');

const main = () => {
  const [ipAddress, port] = getArgs();
  new Server(ipAddress, port, 'xserver.log');
};

main();
