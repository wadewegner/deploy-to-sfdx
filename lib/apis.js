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

  router.post('/status', (req, res) => {

    const guid = req.body.guid;

    postgresHelper.getDeploymentStatus(guid)
      .then((result) => {

        const rows = result.rows;

        let resultMessage = '';
        let complete = false;
        let scratch_url;
        let stage = '';
        let error_message = '';

        let count = 1;

        rows.forEach((row) => {
          const message = row.message;

          complete = row.complete;
          scratch_url = row.scratch_url;
          stage = row.stage;
          error_message = row.error_message;

          if (stage === 'error') {
            complete = true;
          }

          resultMessage = `${count}) ${message}<br/>${resultMessage}`;

          count++;
        });

        res.json({
          message: resultMessage,
          complete,
          scratch_url,
          stage,
          error_message
        });
      });
  });

  router.post('/deploy', (req, res) => {

    const settings = req.body;

    // add additional info to the settings
    settings.access_token = req.cookies.access_token;
    settings.instance_url = req.cookies.instance_url;
    settings.user_name = req.cookies.user_name;

    // create deployment
    const insertQuery = `INSERT INTO deployments (guid, username, repo, settings) VALUES ('${settings.guid}', '${settings.user_name}', '${settings.githubRepo}', '${JSON.stringify(settings)}')`;
    postgresHelper.insertDeployment(insertQuery).then(() => {
      res.json({
        message: settings.guid
      });
    });
  });

};