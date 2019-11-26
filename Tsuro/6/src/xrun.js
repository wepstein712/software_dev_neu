const { Client, Server } = require('../../Remote');
const { DEFAULT_CONN, PLAYER_POOL_SIZE } = require('../../Common/utils/constants');
const { getInput } = require('../../Common/__tests__');

const main = async () => {
  const flags = process.argv.slice(2);
  const ipAddress = flags[0] || DEFAULT_CONN.IP_ADDRESS;
  const port = flags[1] || DEFAULT_CONN.PORT;

  // Disables logging for server and clients, and stores default
  // functionality in `_defaultLog`
  const _defaultLog = console.log;
  console.log = () => {};

  new Server(ipAddress, port, 'xserver.log');

  try {
    const players = await getInput();
    if (players.length < PLAYER_POOL_SIZE.MIN) {
      throw 'Too few players.';
    } else if (players.length > PLAYER_POOL_SIZE.MAX) {
      throw 'Too many players';
    }
    players.forEach(({ name, strategy }) => {
      new Client(ipAddress, port, name, strategy);
    });
  } catch (err) {
    _defaultLog(err);
    process.exit(0);
  }
};

main();
