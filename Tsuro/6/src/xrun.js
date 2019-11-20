const { Client, Server } = require('../../Remote');
const { getInput } = require('../../Common/__tests__');

const main = () => {
  const flags = process.argv.slice(2);
  const [ipAddress, port] = flags;

  new Server(ipAddress, port, true);

  getInput()
    .then(players => {
      if (players.length < 3) {
        throw 'Too few players.';
      } else if (players.length > 5) {
        throw 'Too many players';
      }
      players.forEach(({ name, strategy }) => {
        new Client(ipAddress, port, name, strategy);
      });
    })
    .catch(err => {
      console.log(err);
      process.exit(0);
    });
};

main();
