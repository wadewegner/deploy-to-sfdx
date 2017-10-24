// const commands = require('./commands.js');
const postgresHelper = require('./postgres.js');
const exec = require('child-process-promise').exec;
// const exec = require('child_process').exec;

function run(command, commandScript) {

  return new Promise((resolve) => {

    exec(commandScript, (error, stdout, stderr) => {

      if (stderr && error) {
        resolve(null, stderr.replace(/\r?\n|\r/, '').trim());
      } else {
        resolve(stdout.replace(/\r?\n|\r/, '').trim(), null);
      }

    });
  });
}

function cloneMessage(result, githubRepo) {

  let message = '';
  const stderr = result.stderr;

  if (stderr) {
    message = `Error: ${stderr}.`;
  } else {
    message = `Successfully cloned ${githubRepo}.`;
  }

  return message;
}

function createMessage(result) {

  let message = '';
  const stdout = result.stdout;
  const stderr = result.stderr;

  if (stderr) {
    message = `Error: ${stderr}.`;
  } else {
    message = `${stdout}.`;
  }

  return message;
}

exports.clone = (guid, script, githubRepo) => {

  const stage = 'clone';

  return postgresHelper.updateDeploymentStatus(guid, stage)
    .then(exec(script))
    .then((result) => {
      return cloneMessage(result, githubRepo);
    })
    .then((message) => {
      return postgresHelper.insertDeploymentStep(guid, stage, message)
        .then(() => (message));
    })
    .catch(() => {

    });
};

exports.create = (guid, script) => {

  const stage = 'create';

  return postgresHelper.updateDeploymentStatus(guid, stage)
    .then(exec(script))
    .then((result) => {
      return createMessage(result);
    })
    .then((message) => {
      return postgresHelper.insertDeploymentStep(guid, stage, message)
        .then(() => (message));
    })
    .catch(() => {

    });
};

exports.create2 = () => {

  return new Promise((resolve) => {
    resolve('result3');
  });

};