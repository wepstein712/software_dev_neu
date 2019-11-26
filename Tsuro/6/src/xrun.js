const getArgs = require('./getArgs');
const { Client, Server } = require('../../Remote');
const { DEFAULT_CONN, PLAYER_POOL_SIZE } = require('../../Common/utils/constants');
const { getInput } = require('../../Common/__tests__');

const main = async () => {
  const args = getArgs();
  const ipAddress = args[0] || DEFAULT_CONN.IP_ADDRESS;
  const port = args[1] || DEFAULT_CONN.PORT;

  try {
    const players = await getInput();
    if (players.length < PLAYER_POOL_SIZE.MIN) {
      throw 'Too few players.';
    } else if (players.length > PLAYER_POOL_SIZE.MAX) {
      throw 'Too many players';
    }

    new Server(ipAddress, port, 'xrun.log', false);

    players.forEach(({ name, strategy }) => {
      new Client(ipAddress, port, name, strategy);
    });
  } catch (err) {
    console.log(err);
    process.exit(0);
  }
};

main();
