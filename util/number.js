const _ = require('lodash');

/**
 * Cleaning Number
 * @param tobeClean
 * @returns {string}
 */
module.exports.clean = (tobeClean) => {
  const strippedDotNumber = _.replace(tobeClean, '.00', '');
  const number = strippedDotNumber
    .match(/\d/g)
    .join('');
  return number;
}

/**
 * Squareup number is extra 00 digit. need to trim last 00 digit
 * @param number
 * @returns {number}
 */
module.exports.calibrateAmount = (number) => {
  return number / 100;
}

/**
 *
 * @param tobeClean
 * @returns {number}
 */
module.exports.calculateDiscountNumber = (gross_amount, discount_amount) => {
  return (Math.abs(discount_amount)/gross_amount) * 100;
}
