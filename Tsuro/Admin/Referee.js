const { Board, RuleChecker, SimpleTile } = require('../Common');
const { incrementIndex } = require('../Common/utils');
const { COLORS } = require('../Common/utils/constants');
const { tiles } = require('../Common/__tests__');

const COLOR_SET = [COLORS.WHITE, COLORS.BLACK, COLORS.RED, COLORS.GREEN, COLORS.BLUE];

class Referee {
  /**
   * Creates a new Referee with a new board and no players.
   */
  constructor(logger) {
    this.logger = logger;
    this.board = new Board();
    this.currentPlayerIdx = -1;
    this.deckIdx = 0;
    this.currentTurn = 0;
    this._hasGameStarted = false;

    this.playerMap = {};
    this.currentPlayers = {};
    this.playerIds = [];
    this.rejectedPlayers = [];
    this.removedPlayersForTurn = {};

    this.observerMap = {};
  }

  /**
   * Adds an observer to the current game.
   *
   * @param {Observer} observer the observer to add to the game
   */
  addObserver(observer) {
    const { id } = observer;
    this.observerMap[id] = observer;

    this.playerIds.forEach(playerId => {
      observer.setColor(playerId, this.playerMap[playerId].getColor());
    });
  }

  /**
   * @private
   * Gets a list of all observers in the current game.
   *
   * @returns {Observer[]} an array of all current observers
   */
  _getObservers() {
    return Object.values(this.observerMap);
  }

  /**
   * @private
   * Helper function for quickly updating all observers, using the given
   * update function.
   *
   * @param {function} updateFunc a callback function which takes in a
   * single observer and updates it accordingly
   */
  _updateObservers(updateFunc) {
    this._getObservers().forEach(updateFunc);
  }

  /**
   * Adds a player to the current game, and sets their color.
   *
   * @param {Player} player the player to add to the game
   * @returns {string} the color the player was set to
   */
  addPlayer(player) {
    const playerIdx = this.playerIds.length;
    if (playerIdx >= COLOR_SET.length) {
      throw 'Max players already added.';
    }
    const { id } = player;
    const color = COLOR_SET[playerIdx];
    player.setColor(id, color);

    this.playerIds.forEach(playerId => {
      // sets this player's color for existing players
      this.playerMap[playerId].setColor(id, color);
      // sets existing player's color for this player
      const playerColor = this.playerMap[playerId].getColor();
      player.setColor(playerId, playerColor);
    });

    this._updateObservers(observer => {
      observer.setPlayerColor(id, color);
    });

    this.playerMap[id] = player;
    this.currentPlayers[id] = player;
    this.playerIds.push(id);

    return color;
  }

  getPlayers() {
    return Object.keys(this.currentPlayers);
  }

  /**
   * @private
   * Checks whether the given player has an avatar currently on
   * the board.
   *
   * @param {Player} player the player to check for
   * @returns {boolean} whether the given player has an avatar
   * currently on the baord
   */
  _hasAvatar(player) {
    return !!this.board.getAvatar(player.id);
  }

  /**
   * @private
   * Checks whether the given player can move, ala if they have
   * lost or not.
   *
   * @param {Player} player the player to check for
   * @returns {boolean} whether the given player has lost the
   * game
   */
  _canPlayerMove(player) {
    const avatar = this.board.getAvatar(player.id);
    return !avatar.hasLost();
  }

  /**
   * @private
   * Gets a hand of the given size to give to the player.
   *
   * @param {number} size the preferred size of the hand
   * @returns {Tile[]} the hand of tiles
   */
  _getHand(size) {
    const hand = [];
    for (let i = 0; i < size; i++) {
      hand.push(new SimpleTile(this.deckIdx));
      this.deckIdx = incrementIndex(this.deckIdx, tiles);
    }
    return hand;
  }

  /**
   * @private
   * Starts a player's turn by updating their board state, setting their
   * turn status to current, and giving them their hand.
   *
   * @param {Player} player the player to start-up
   * @param {number} handSize the size of the player's hand
   * @returns {BoardState} the current board state
   */
  _startPlayerTurn(player, handSize) {
    this.logger.debug(player.id, 'has started their turn.');
    this.currentTurn += 1;
    const boardState = this.board.getState();
    player.updateState(boardState);
    player.setTurnStatus(true);
    const hand = this._getHand(handSize);
    player.receiveHand(hand);

    this._updateObservers(observer => {
      observer.updateState(boardState);
      observer.updateCurrentTurn(this.currentTurn);
      observer.updateCurrentPlayerId(player.id);
      observer.updateCurrentHand(hand);
    });

    return boardState;
  }

  /**
   * @private
   * Checks if the given action is legal for the given player, that is it
   * can be placed on the board at all.
   *
   * @param {BoardState} boardState the current state of the board
   * @param {Player} player the player to check legality for
   * @param {BaseAction} action the action to check legality for
   * @param {boolean} [isInitial=false] whether the given action is
   * initial or intermediate
   * @returns {boolean} whether the given action is legal for the
   * given player
   */
  _checkForActionLegality(boardState, player, action, isInitial = false) {
    const isLegal = RuleChecker.checkPlacementLegality(boardState, action, player);
    if (isInitial) {
      return (
        isLegal ||
        RuleChecker.canPlaceAvatar(
          boardState,
          player.id,
          action.coords,
          action.tile,
          action.position
        )
      );
    }

    return isLegal;
  }

  /**
   * @private
   * Checks if the given action is valid for the given player, that is it
   * doesn't result in player suicide.
   *
   * @param {BoardState} boardState the current state of the board
   * @param {Player} player the player to check validity for
   * @param {BaseAction} action the action to check validity for
   * @param {boolean} [isInitial=false] whether the given action is
   * initial or intermediate
   * @returns {boolean} whether the given action is valid for the
   * given player
   */
  _checkForActionValidity(boardState, player, action, isInitial = false) {
    if (isInitial) {
      return true;
    }
    return RuleChecker.checkPlacementValidity(boardState, action, player);
  }

  /**
   * @private
   * Ends a player's turn by clearing their hand, setting their turn status
   * to waiting, and updating all players' board states.
   *
   * @param {Player} player the player to close out
   */
  _endPlayerTurn(player) {
    player.clearHand();
    player.setTurnStatus(false);
    const boardState = this.board.getState();
    this.playerIds.forEach(id => {
      this.playerMap[id].updateState(boardState);
    });
    this._updateObservers(observer => {
      observer.updateState(boardState);
    });
    this.logger.debug(player.id, 'has ended their turn.');
  }

  /**
   * Removes a player from play.
   *
   * @param {string} playerId the ID of the player to remove from play
   * @param {boolean} [fromLegalMove=true] will add to rejected players if false
   * @param {boolean} [permanent=false] whether the player should be removed
   * permanently from the game (e.g.: client has disconnected from game)
   */
  removePlayer(playerId, fromLegalMove = true, permanent = false) {
    if (this.currentPlayers[playerId]) {
      delete this.currentPlayers[playerId];

      if (permanent && !this._hasGameStarted) {
        const playerIndex = this.playerIds.findIndex(id => id === playerId);
        this.playerIds.splice(playerIndex, 1);
        delete this.playerMap[playerId];

        // alert observer and other players of permanent player remove
      } else {
        if (fromLegalMove) {
          this.removedPlayersForTurn[this.currentTurn] = [
            ...(this.removedPlayersForTurn[this.currentTurn] || []),
            playerId,
          ];
        } else {
          this.rejectedPlayers.push(playerId);
        }

        const player = this.playerMap[playerId];
        player.lose(fromLegalMove);
        this._updateObservers(observer => {
          observer.removePlayer(playerId);
        });
      }
    }
  }

  /**
   * @private
   * Places a tile on the board at the player's given discression. Also places the player's
   * avatar if the action is initial. Then ends player's turn.
   *
   * @param {Player} player the player to use the action for
   * @param {BaseAction} action the action to use
   * @param {boolean} [isInitial=false] whether the action is initial or intermediate
   */
  _usePlayerAction(player, action, isInitial = false) {
    const { coords, position, tile } = action;
    if (isInitial) {
      try {
        this.board.placeInitialTileAvatar(player, tile, coords, position);
      } catch (err) {
        this.removePlayer(player.id);
      }
    } else {
      this.board.placeTile(tile, coords);
    }
    this._updateObservers(observer => {
      observer.updateLastAction(action);
    });
    this._endPlayerTurn(player);
  }

  /**
   * @private
   * Plays through an entire player's turn, from start to end. This will start
   * the player's turn, prompt them for action, and check for legality and
   * validity. If the action isn't legal or valid, the player will be removed
   * from play. Regardless, if the action is legal, the action will be played.
   *
   * @param {Player} player the player to prompt for action
   * @param {boolean} [isInitial=false] whether to prompt for an initial or
   * intermediate action
   */
  async _promptPlayerForAction(player, isInitial = false) {
    const handSize = isInitial ? 3 : 2;
    const boardState = this._startPlayerTurn(player, handSize);
    try {
      const action = await player.getAction(isInitial);
      const isLegal = this._checkForActionLegality(boardState, player, action, isInitial);
      const isValid = this._checkForActionValidity(boardState, player, action, isInitial);
      if (!isValid || !isLegal) {
        this.removePlayer(player.id, isLegal);
      }
      if (isLegal) {
        this._usePlayerAction(player, action, isInitial);
      }
    } catch (err) {
      this.removePlayer(player.id, false);
    }
  }

  /**
   * @private
   * Changes the current player to the next on in line. If the player is no longer
   * playing, their turn will be skipped. If the player doesn't have an avatar on
   * the board, they will be prompted for an initial action. If they do have an
   * avatar and can move, they will be prompted for an intermediate action. If
   * neither, they will be removed from play.
   */
  async _nextPlayer() {
    this.currentPlayerIdx = incrementIndex(this.currentPlayerIdx, this.playerIds);
    const id = this.playerIds[this.currentPlayerIdx];
    const player = this.currentPlayers[id];

    if (player) {
      if (!this._hasAvatar(player)) {
        await this._promptPlayerForAction(player, true);
      } else if (this._canPlayerMove(player)) {
        await this._promptPlayerForAction(player);
      } else {
        this.removePlayer(player.id);
      }
    }
  }

  /**
   * Checks whether the game is over yet, that is if one or no players
   * are left on the board.
   *
   * @returns {boolean} whether the game is over yet
   */
  isGameOver() {
    return Object.keys(this.currentPlayers).length <= 1;
  }

  /**
   * @private
   * Gets the current winners of the game, that is those are still in play. If
   * none are left in play, it will check for the last turn in which players
   * have been removed and award those players.
   *
   * @returns {string[]} an array of player IDs
   */
  getWinners() {
    const result = Object.keys(this.removedPlayersForTurn)
      .sort((a, b) => b - a)
      .map(turn => this.removedPlayersForTurn[turn]);
    // Put winners in front
    const currentPlayers = Object.keys(this.currentPlayers);
    if (currentPlayers.length > 0) {
      result.unshift(currentPlayers);
    }
    return result;
  }

  /**
   * Returns a list of player Id's that have been eliminated from the game by taking illegal moves.
   *
   * @returns {string[]} an array of IDs for players eliminated from the game
   */
  getLosers() {
    return this.rejectedPlayers.slice();
  }

  /**
   * @private
   * Notifies all players that the game is now over, and which players have
   * won the game.
   */
  _notifyPlayersOfGameOver() {
    const winners = this.getWinners();
    const losers = this.getLosers();
    this.playerIds.forEach(id => {
      this.playerMap[id].endGame(winners, losers);
    });
  }

  /**
   * Starts and runs a game with the currently added players. This function
   * will loop until the game is over, at which point all players will
   * be notified of game over and who won.
   */
  async runGame() {
    if (!this._hasGameStarted) {
      if (this.playerIds.length <= 1) {
        throw 'At least two players are required to game.';
      }

      this._hasGameStarted = true;

      while (!this.isGameOver()) {
        await this._nextPlayer();
      }

      this._notifyPlayersOfGameOver();
    }
  }
}

module.exports = Referee;
