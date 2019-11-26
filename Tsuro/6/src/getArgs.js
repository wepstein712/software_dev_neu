/**
 * Gets the arguments for the current Node process.
 *
 * @returns {string[]} the Node arguments
 */
const getArgs = () => process.argv.slice(2);

module.exports = getArgs;
