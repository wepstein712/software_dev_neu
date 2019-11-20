const { Client } = require('../../Remote');

const main = () => {
  const flags = process.argv.slice(2);
  const [ipAddress, port, name, strategy] = flags;

  new Client(ipAddress, port, name, strategy);
};

main();
