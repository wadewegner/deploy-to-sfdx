const commands = require('./commands.js');
const postgresHelper = require('./postgres.js');

module.exports = function (router) {

  router.get('/test', (req, res) => {

    const script = 'jq --help';

    commands.run('test', script, (result) => {
      res.json({
        message: result
      });
    });

  });

  router.post('/deploying', (req, res) => {

    const command = req.body.command;
    const timestamp = req.body.timestamp;
    const param = req.body.param;
    const access_token = req.cookies.access_token;
    const instance_url = req.cookies.instance_url;
    const user_name = req.cookies.user_name;

    const tokenName = access_token.replace(/\W/g, '');
    const startingDirectory = process.env.STARTINGDIRECTORY;
    const directory = `${tokenName}-${timestamp}`;

    let script;

    switch (command) {

      case 'clone':

        const insertQuery = `INSERT INTO deployments (username, repo) VALUES ('${user_name}', '${param}')`;

        postgresHelper.insertDeployment(insertQuery).then(() => {

          script = `${startingDirectory}mkdir ${directory};cd ${directory};git clone ${param} .`;

          commands.run(command, script, (commandResult, commandErr) => {

            if (commandErr) {
              res.status(500);
              res.json({
                message: `Error: ${commandErr}.`
              });
            } else {
              res.json({
                message: `Successfully cloned ${param}.`
              });
            }

          });
        });

        break;

      case 'create':

        script = `${startingDirectory}cd ${directory};export SFDX_LAZY_LOAD_MODULES=true;export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${instance_url}`;

        commands.run(command, script, () => {

          script = `${startingDirectory}cd ${directory};export SFDX_LAZY_LOAD_MODULES=true;export FORCE_SHOW_SPINNER=;sfdx force:org:create -v '${access_token}' -s -f ${param}`;

          commands.run(command, script, (commandResult, commandErr) => {

            if (commandErr) {
              res.status(500);
              res.json({
                message: `Error: ${commandErr}.`
              });
            } else {
              res.json({
                message: `${commandResult}.`
              });
            }

          });
        });

        break;

      case 'push':

        script = `${startingDirectory}cd ${directory};export SFDX_LAZY_LOAD_MODULES=true;export FORCE_SHOW_SPINNER=;sfdx force:source:push --json | jq '.result.pushedSource | length'`;

        commands.run(command, script, (commandResult, commandErr) => {

          if (commandErr) {
            res.status(500);
            res.json({
              message: `Error: ${commandErr}.`
            });
          } else {
            res.json({
              message: `Pushed ${commandResult} source files.`
            });
          }

        });

        break;

      case 'permset':

        script = `${startingDirectory}cd ${directory};export SFDX_LAZY_LOAD_MODULES=true;export FORCE_SHOW_SPINNER=;sfdx force:user:permset:assign -n ${param}`;

        commands.run(command, script, (commandResult, commandErr) => {

          if (commandErr) {
            res.status(500);
            res.json({
              message: `Error: ${commandErr}.`
            });
          } else {
            res.json({
              message: `Permset '${param}' assigned.`
            });
          }

        });

        break;

      case 'test':

        if (!param) {
          
          res.json({
            message: 'No tests executed.'
          });

          break;
        }

        script = `${startingDirectory}cd ${directory};export SFDX_LAZY_LOAD_MODULES=true;export FORCE_SHOW_SPINNER=;sfdx force:apex:test:run -r human --json | jq -r .result | jq -r .summary | jq -r .outcome`;

        commands.run(command, script, (commandResult, commandErr) => {

          if (commandErr) {
            res.status(500);
            res.json({
              message: `Error: ${commandErr}.`
            });
          } else {
            res.json({
              message: `Apex tests: ${commandResult}.`
            });
          }

        });

        break;

      case 'url':

        script = `${startingDirectory}cd ${directory};export SFDX_LAZY_LOAD_MODULES=true;export FORCE_SHOW_SPINNER=;echo $(sfdx force:org:display --json | jq -r .result.instanceUrl)"/secur/frontdoor.jsp?sid="$(sfdx force:org:display --json | jq -r .result.accessToken)`;

        commands.run(command, script, (commandResult, commandErr) => {

          if (commandErr) {
            res.status(500);
            res.json({
              message: `Error: ${commandErr}.`
            });
          } else {
            res.json({
              message: `${commandResult}`
            });
          }

        });

        break;

      case 'clean':

        script = `${startingDirectory}rm -rf ${directory}`;

        commands.run(command, script, (commandResult, commandErr) => {

          if (commandErr) {
            res.status(500);
            res.json({
              message: `Error: ${commandErr}.`
            });
          } else {
            res.json({
              message: 'Removed temp files and cleaned up.'
            });
          }
        });

        break;
    }
  });
};