const _ = require('lodash');

module.exports.clean = (tobeClean) => {
  const strippedDotNumber = _.replace(tobeClean, '.00', '');
  const number = strippedDotNumber
    .match(/\d/g)
    .join('');
  return number;
}
