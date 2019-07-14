const fs = require('fs');

module.exports.readFile = (path, opts = 'utf8') => new Promise((res, rej) => {
  fs.readFile(path, opts, (err, data) => {
    if (err) {
      rej(err);
    } else {
      res(data);
    }
  });
});
