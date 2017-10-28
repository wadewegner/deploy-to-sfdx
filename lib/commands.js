const {
  exec
} = require('child_process');

exports.run = (command, commandScript) => {

  return new Promise((resolve) => {

    exec(commandScript, (err, stdout, stderr) => {
      if (stderr && err) {
        console.error('run:err', command, commandScript, stdout);
        resolve(null, stderr.replace(/\r?\n|\r/, '').trim());
      }

      resolve(stdout.replace(/\r?\n|\r/, '').trim(), null);
    });
  });
};