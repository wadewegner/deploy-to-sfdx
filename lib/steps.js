// const commands = require('./commands.js');
const postgresHelper = require('./postgres.js');
// const {
//   exec
// } = require('child_process');

const exec = require('child-process-promise').exec;

function run(command, commandScript) {

  let output = '';

  return exec(commandScript)
    .then((result) => {
      const stdout = result.stdout;
      const stderr = result.stderr;
      console.log('run:stdout:', command, stdout);
      console.log('run:stderr:', command, stderr);

      if (stderr) {
        output = stderr.replace(/\r?\n|\r/, '').trim();
      } else {
        output = stdout.replace(/\r?\n|\r/, '').trim();
      }

      return output;
    })
    .catch((err) => {
      console.error('run:ERROR: ', err);
    });

}

function cloneMessage(commandResult, commandErr, githubRepo) {

  let message = '';

  if (commandErr) {
    message = `Error: ${commandErr}.`;
  } else {
    message = `Successfully cloned ${githubRepo}.`;
  }

  return message;
}

function createMessage(commandResult, commandErr) {

  let message = '';

  if (commandErr) {
    message = `Error: ${commandErr}.`;
  } else {
    message = `${commandResult}.`;
  }
  console.log('createMessage', message);

  return message;
}

exports.clone = (guid, script, githubRepo) => {

  const stage = 'clone';

  return postgresHelper.updateDeploymentStatus(guid, stage)
    .then(run(stage, script))
    .then((commandResult, commandError) => cloneMessage(commandResult, commandError, githubRepo))
    .then((message) => {
      return postgresHelper.insertDeploymentStep(guid, stage, message)
        .then(() => (message));
    });
};

exports.create = (guid, script) => {

  const stage = 'create';

  return postgresHelper.updateDeploymentStatus(guid, stage)
    .then(run(stage, script))
    .then((commandResult, commandError) => createMessage(commandResult, commandError))
    .then((message) => {
      return postgresHelper.insertDeploymentStep(guid, stage, message)
        .then(() => (message));
    });

};

exports.create2 = () => {

  return new Promise((resolve) => {
    resolve('result3');
  });

};