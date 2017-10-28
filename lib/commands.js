const {
  exec
} = require('child_process');

// module.exports = {
//   run: (command, commandScript, commandResult) => {
//     console.log(command, commandScript);
//     exec(commandScript, (err, stdout, stderr) => {
//       if (stderr && err) {

//         console.log(`${command}:err`, err);
//         console.log(`${command}:stderr`, stderr);

//         commandResult(null, stderr.replace(/\r?\n|\r/, '').trim());
//         return;
//       }

//       commandResult(stdout.replace(/\r?\n|\r/, '').trim(), null);
//     });
//   }
// };

exports.run = (command, commandScript) => {

  return new Promise((resolve) => {

    exec(commandScript, (err, stdout, stderr) => {
      if (stderr && err) {
        console.log('run:err', command, commandScript, stdout);
        resolve(null, stderr.replace(/\r?\n|\r/, '').trim());
      }

      console.log('run:success', command, commandScript, stdout);
      resolve(stdout.replace(/\r?\n|\r/, '').trim(), null);
    });
  });
};