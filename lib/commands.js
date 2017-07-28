const {
  exec
} = require('child_process');

module.exports = {
  run: (command, commandScript, result) => {
    console.log(command, commandScript);
    exec(commandScript, (err, stdout, stderr) => {
      if (stderr || err) {
        console.log(`${command}:err`, err);
        console.log(`${command}:stderr`, stderr);
      }
      result(stdout);
    });
  }
};