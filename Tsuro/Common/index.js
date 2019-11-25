require('./utils/polyfills');

exports.RenderUtils = require('./renderUtils');
exports.Coords = require('./coords');
exports.Position = require('./position');
exports.Avatar = require('./avatar');
exports.Path = require('./path');
exports.Tile = require('./tiles');
exports.SimpleTile = require('./SimpleTile');
exports.BoardState = require('./boardState');
exports.Board = require('./board');
exports.RuleChecker = require('./rules');

const { InitialAction, IntermediateAction } = require('./action');
exports.InitialAction = InitialAction;
exports.IntermediateAction = IntermediateAction;
