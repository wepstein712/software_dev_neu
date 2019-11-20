/* eslint-disable no-unused-vars */

const path = require('path');
const { Observer, Referee } = require('./Admin');
const Player = require('./Player/Player');
const { STRATEGIES } = require('./Common/utils/constants');

const jack = new Player('jack', 'Jack', STRATEGIES.DUMB);
const jill = new Player('jill', 'Jill', STRATEGIES.DUMB);
const wirt = new Player('wirt', 'Wirt', STRATEGIES.DUMB);
const greg = new Player('greg', 'Greg', STRATEGIES.DUMB);
const woodsman = new Player('woodsman', 'Woodsman', STRATEGIES.DUMB);
const beast = new Player('beast', 'Beast', STRATEGIES.DUMB);

const referee = new Referee();
const observer = new Observer();

referee.addObserver(observer);
referee.addPlayer(jack); // Not enough players
referee.addPlayer(jill); // Jill wins
referee.addPlayer(wirt); // Wirt wins
// referee.addPlayer(greg); // Jill wins
// referee.addPlayer(woodsman); // Jack wins
// referee.addPlayer(beast); // Max players reached
referee.runGame();

observer.renderToFile('final.png');
