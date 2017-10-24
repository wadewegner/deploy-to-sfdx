const steps = require('./lib/steps.js');
const async = require('async');
const pgp = require('pg-promise')();
const dbUrl = require('url');
const exec = require('child-process-promise').exec;

const dbParams = dbUrl.parse(process.env.DATABASE_URL);
const auth = dbParams.auth.split(':');

const config = {
  host: dbParams.hostname,
  port: dbParams.port,
  user: auth[0],
  ssl: true,
  password: auth[1],
  database: dbParams.pathname.split('/')[1],
  idleTimeoutMillis: 1000,
  max: 10
};

const db = pgp(config);

function setNewStage(settings, stage) {
  settings.stage = stage;
  return settings;
}

function deploymentStage(settings, complete) {
  if (!complete) { complete = false; }

  const updateQuery = `UPDATE deployments SET stage = '${settings.stage}', complete = ${complete} WHERE guid = '${settings.guid}'`;
  db.any(updateQuery, [true]);
  return settings;
}

function deploymentSteps(settings) {
  const insertQuery = `INSERT INTO deployment_steps (guid, stage, message) VALUES ('${settings.guid}', '${settings.stage}', '${settings.message}')`;
  db.any(insertQuery, [true]);
  return settings;
}

function formatMessage(settings) {

  let message = '';

  if (settings.stderr) {
    message = `Error: ${settings.stderr}.`;
  } else {
    message = `${settings.stdout}.`;

    if (settings.stage === 'clone') {
      message = `Successfully cloned ${settings.githubRepo}.`;
    }
    if (settings.stage === 'instanceUrl') {
      message = `Set instance url to ${settings.instance_url}.`;
    }
    if (settings.stage === 'push') {
      message = `Pushed ${settings.stdout} source files.`;
    }
    if (settings.stage === 'permset') {
      if (!settings.assignPermset) {
        message = 'No permset specified.';
      } else {
        message = `Permset '${settings.permsetName}' assigned.`;
      }
    }
    if (settings.stage === 'test') {
      message = `Apex tests: ${settings.stdout}.`;
    }
  }

  console.log('message', settings.stage, message);
  settings.message = message;
  return settings;
}

function executeScript(settings, script) {
  return new Promise((resolve) => {
    exec(script, (error, stdout, stderr) => {

      settings.stderr = '';
      if (stderr && error) {
        settings.stderr = stderr.replace(/\r?\n|\r/, '').trim();
      }
      settings.stdout = stdout.replace(/\r?\n|\r/, '').trim();

      resolve(settings);
    });
  });
}

// check for anything at init
async.whilst(
  () => true,
  (callback) => {

    const selectQuery = "SELECT guid, username, repo, settings FROM deployments WHERE stage = 'init' AND complete = false LIMIT 1";

    db.any(selectQuery, [true])
      .then((data) => {

        // throw if no data to skip the subsequent promises
        if (data.length === 0) {
          throw new Error('norecords');
        }

        console.log('found data');

        const settings = JSON.parse(data[0].settings);

        settings.guid = data[0].guid;
        settings.tokenName = settings.access_token.replace(/\W/g, '');
        settings.startingDirectory = process.env.STARTINGDIRECTORY;
        settings.directory = `${settings.tokenName}-${settings.guid}`;

        settings.cloneScript = `${settings.startingDirectory}rm -rf ${settings.directory};mkdir ${settings.directory};cd ${settings.directory};git clone ${settings.githubRepo} .`;
        settings.instanceUrlScript = `${settings.startingDirectory}cd ${settings.directory};export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${settings.instance_url};`;
        settings.createScript = `${settings.startingDirectory}cd ${settings.directory};export FORCE_SHOW_SPINNER=;sfdx force:org:create -v '${settings.access_token}' -s -f ${settings.scratchOrgDef}`;
        settings.pushScript = `${settings.startingDirectory}cd ${settings.directory};export FORCE_SHOW_SPINNER=;sfdx force:source:push --json | jq '.result.pushedSource | length'`;
        settings.permSetScript = `${settings.startingDirectory}cd ${settings.directory};export FORCE_SHOW_SPINNER=;sfdx force:user:permset:assign -n ${settings.permsetName}`;
        settings.testScript = `${settings.startingDirectory}cd ${settings.directory};export FORCE_SHOW_SPINNER=;sfdx force:apex:test:run -r human --json | jq -r .result | jq -r .summary | jq -r .outcome`;
        settings.urlScript = `${settings.startingDirectory}cd ${settings.catchdirectory};export FORCE_SHOW_SPINNER=;echo $(sfdx force:org:display --json | jq -r .result.instanceUrl)"/secur/frontdoor.jsp?sid="$(sfdx force:org:display --json | jq -r .result.accessToken)`;

        console.log(settings);

        return settings;
      })
      // clone
      .then(settings => setNewStage(settings, 'clone'))
      .then(settings => deploymentStage(settings))
      .then(settings => executeScript(settings, settings.cloneScript))
      .then(settings => formatMessage(settings))
      .then(settings => deploymentSteps(settings))
      // instanceUrl
      .then(settings => setNewStage(settings, 'instanceUrl'))
      .then(settings => deploymentStage(settings))
      .then(settings => executeScript(settings, settings.instanceUrlScript))
      .then(settings => formatMessage(settings))
      .then(settings => deploymentSteps(settings))
      // create
      .then(settings => setNewStage(settings, 'create'))
      .then(settings => deploymentStage(settings))
      .then(settings => executeScript(settings, settings.createScript))
      .then(settings => formatMessage(settings))
      .then(settings => deploymentSteps(settings))
      // push
      .then(settings => setNewStage(settings, 'push'))
      .then(settings => deploymentStage(settings))
      .then(settings => executeScript(settings, settings.pushScript))
      .then(settings => formatMessage(settings))
      .then(settings => deploymentSteps(settings))
      // permset
      .then(settings => setNewStage(settings, 'permset'))
      .then(settings => deploymentStage(settings))
      .then(settings => executeScript(settings, settings.permSetScript))
      .then(settings => formatMessage(settings))
      .then(settings => deploymentSteps(settings))
      // test
      .then(settings => setNewStage(settings, 'test'))
      .then(settings => deploymentStage(settings))
      .then(settings => executeScript(settings, settings.testScript))
      .then(settings => formatMessage(settings))
      .then(settings => deploymentSteps(settings))
      // url
      .then(settings => setNewStage(settings, 'url'))
      .then(settings => deploymentStage(settings))
      .then(settings => executeScript(settings, settings.urlScript))
      .then(settings => formatMessage(settings))
      .then(settings => deploymentSteps(settings))

      // completed
      .then(settings => setNewStage(settings, 'complete'))
      .then(settings => deploymentStage(settings, true))
      .then(() => {
        console.log('done');
      })
      .catch((error) => {
        // handles cases where there are no records
        if (error.message !== 'norecords') {
          console.log('error', error);
        }
      });

    setTimeout(() => {
      callback(null, true);
    }, 3000);
  },
  (err) => {
    console.log(`err: ${err}`);
  }
);