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

    console.log('status', guid);

    postgresHelper.getDeploymentStatus(guid)
      .then((result) => {

        let resultMessage = '';
        let complete = false;

        const rows = result.rows;
        rows.forEach((row) => {
          const message = row.message;
          const created_at = row.created_at;
          complete = row.complete;

          resultMessage = `${message}\n${resultMessage}`;
        });

        res.json({
          message: resultMessage,
          complete
        });
      });
  });

  router.post('/deploy', (req, res) => {

    // const guid = Guid.raw();
    // 
    const settings = req.body;

    // add additional info to the settings
    settings.access_token = req.cookies.access_token;
    settings.instance_url = req.cookies.instance_url;
    settings.user_name = req.cookies.user_name;
    // settings.guid = guid;
    console.log('guid', settings.guid);

    // create deployment

    const insertQuery = `INSERT INTO deployments (guid, username, repo, settings) VALUES ('${settings.guid}', '${settings.user_name}', '${settings.githubRepo}', '${JSON.stringify(settings)}')`;
    postgresHelper.insertDeployment(insertQuery).then(() => {

      res.json({
        message: settings.guid
      });
    });
  });

};