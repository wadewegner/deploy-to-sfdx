const {
  exec
} = require('child_process');

module.exports = {
  run: (command, commandScript, commandResult) => {
    // console.log(command, commandScript);
    exec(commandScript, (err, stdout, stderr) => {
      if (stderr && err) {

          console.log(`${command}:err`, err);
          console.log(`${command}:stderr`, stderr);

          commandResult(null, stderr.replace(/\r?\n|\r/, '').trim());
          return;
      }
      
      commandResult(stdout.replace(/\r?\n|\r/, '').trim(), null);
    });
  }
};