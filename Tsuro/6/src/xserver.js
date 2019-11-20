const { Server } = require('../../Remote');

const main = () => {
  const flags = process.argv.slice(2);
  const [ipAddress, port] = flags;

  new Server(ipAddress, port);
};

main();
