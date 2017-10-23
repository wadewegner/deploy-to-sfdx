const commands = require('./commands.js');
const postgresHelper = require('./postgres.js');
const Guid = require('guid');
const amqpOpen = require('amqplib').connect(process.env.CLOUDAMQP_URL);

module.exports = function (router) {

  router.get('/test', (req, res) => {

    const script = 'jq --help';

    commands.run('test', script, (result) => {
      res.json({
        message: result
      });
    });
  });

  router.post('/status', (req, res) => {

    const stage = req.body.stage;
    const guid = req.body.guid;
    const queueName = stage + guid;

    console.log('status', stage, guid);

    amqpOpen
      .then((conn) => {
        return conn.createChannel();
      })
      .then((ch) => {
        return ch.assertQueue(queueName, {
            durable: true
          })
          .then((ok) => {

            return ch.consume(queueName, (msg) => {
              console.log('status:consume', queueName, msg);

              if (msg !== null) {

                const message = msg.content.toString();
                console.log('status:dequeued message', queueName, message);

                const response = {};

                response.guid = guid;
                response.message = message;

                res.json({
                  message: message
                });

                console.log('status:response', queueName, message);

                ch.ack(msg);
                ch.close();
              }
            });
          });
      }).catch(console.warn);


  });

  router.post('/deploy', (req, res) => {

    const guid = Guid.raw();
    const settings = req.body;

    // add additional info to the settings
    settings.access_token = req.cookies.access_token;
    settings.instance_url = req.cookies.instance_url;
    settings.user_name = req.cookies.user_name;
    settings.guid = guid;

    // create deployment

    const insertQuery = `INSERT INTO deployments (guid, username, repo, settings) VALUES ('${settings.guid}', '${settings.user_name}', '${settings.githubRepo}', '${JSON.stringify(settings)}')`;
    postgresHelper.insertDeployment(insertQuery).then(() => {

      res.json({
        message: guid
      });
    });
  });

  // depcreating this API
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

        script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${instance_url}`;

        commands.run(command, script, () => {

          script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:org:create -v '${access_token}' -s -f ${param}`;

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

        script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:source:push --json | jq '.result.pushedSource | length'`;

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

        script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:user:permset:assign -n ${param}`;

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

        script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:apex:test:run -r human --json | jq -r .result | jq -r .summary | jq -r .outcome`;

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

        script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;echo $(sfdx force:org:display --json | jq -r .result.instanceUrl)"/secur/frontdoor.jsp?sid="$(sfdx force:org:display --json | jq -r .result.accessToken)`;

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