const fs = require('fs');
const fse = require('fs-extra');

module.exports.readFile = (path, opts = 'utf8') =>
  new Promise((res, rej) => {
    fs.readFile(path, opts, (err, data) => {
      if (err) {
        rej(err);
      } else {
        res(data);
      }
    });
  });

module.exports.fse = fse;
module.exports.fs = fs;
