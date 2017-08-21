const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const oauth2 = require('salesforce-oauth2');
const jsforce = require('jsforce');
const commands = require('./lib/commands.js');
const postgresHelper = require('./lib/postgres.js');

const {
  exec
} = require('child_process');

const app = express();

const callbackUrl = process.env.CALLBACKURL;
const consumerKey = process.env.CONSUMERKEY;
const consumerSecret = process.env.CONSUMERSECRET;

app.use('/scripts', express.static(`${__dirname}/scripts`));
app.use('/dist', express.static(`${__dirname}/dist`));

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(cookieParser());

app.get('*', (req, res, next) => {

  // console.log('NODE_ENV', process.env.NODE_ENV);
  // console.log('x-forwarded-proto', req.headers['x-forwarded-proto']);

  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    res.redirect(`https://deploy-to-sfdx.com${req.url}`);
  }

  return next();
});

app.get('/', (req, res) => {

  postgresHelper.getDeploymentCount().then((deploymentCountResult) => {

    const deploymentCount = deploymentCountResult.rows[0].count;

    res.render('pages/index', {
      deploymentCount: deploymentCount
    });
  });
});

app.get('/about', (req, res) => {
  res.render('pages/about');
});

app.get('/notdevhub', (req, res) => {

  const template = req.query.template;
  const user_name = req.cookies.user_name;

  res.render('pages/notdevhub', {
    template: template,
    user_name: user_name
  });
});

app.get('/choose', (req, res) => {
  const user_name = req.cookies.user_name;

  res.render('pages/choose', {
    user_name: user_name
  });
});

app.get('/deploy', (req, res) => {

  const template = req.query.template;
  const access_token = req.cookies.access_token;
  const instance_url = req.cookies.instance_url;
  const user_name = req.cookies.user_name;

  if (access_token && instance_url) {
    res.render('pages/deploy', {
      template: template,
      access_token: access_token,
      instance_url: instance_url,
      user_name: user_name
    });
  } else {
    return res.redirect('/login');
  }
});

app.get('/deploying', (req, res) => {
  const template = req.query.template;
  res.render('pages/deploying', {
    template: template
  });
});

app.get("/login", (req, res) => {

  const template = req.query.template;

  const uri = oauth2.getAuthorizationUrl({
    redirect_uri: callbackUrl,
    client_id: consumerKey,
    scope: 'id api openid',
    state: template,
    prompt: 'select_account'
  });
  return res.redirect(uri);
});

app.get('/logout', (req, res) => {

  const access_token = req.cookies.access_token;
  const instance_url = req.cookies.instance_url;

  const conn = new jsforce.Connection({
    instanceUrl: instance_url,
    accessToken: access_token
  });

  conn.logout((err) => {
    if (err) {
      return console.error(err);
    }
    res.clearCookie('access_token');
    res.clearCookie('instance_url');

    return res.redirect('/');
  });
});

app.get('/oauth/callback', (req, res) => {
  const authorizationCode = req.param('code');
  const template = req.param('state'); // TODO: use state and query instead of cookies

  oauth2.authenticate({
    redirect_uri: callbackUrl,
    client_id: consumerKey,
    client_secret: consumerSecret,
    code: authorizationCode
  }, (error, payload) => {

    res.cookie('access_token', payload.access_token);
    res.cookie('instance_url', payload.instance_url);
    res.cookie('refresh_token', payload.refresh_token);

    // check to see if org is a dev hub
    const conn = new jsforce.Connection({
      instanceUrl: payload.instance_url,
      accessToken: payload.access_token
    });

    conn.identity((err, identity) => {
      if (err) {
        return console.error(err);
      }

      res.cookie('user_name', identity.username);

      conn.tooling.query("SELECT DurableId, SettingValue FROM OrganizationSettingsDetail WHERE SettingName = 'ScratchOrgManagementPref'", (err, result) => {
        if (err) {
          return console.error(err);
        }

        //waw const template = req.cookies.template;

        if (result.size > 0) {
          const devHubEnabled = result.records[0].SettingValue;

          if (devHubEnabled === true) {
            if (template) {
              return res.redirect(`/deploy?template=${template}`);
            } else {
              return res.redirect('/choose');
            }
          } else {
            return res.redirect('/notdevhub');
          }
        } else {
          return res.redirect('/notdevhub');
        }
      });
    });
  });
});

const router = express.Router();

router.get('/test', (req, res) => {

  const script = `jq --help`;

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
  const refresh_token = req.cookies.refresh_token;
  const user_name = req.cookies.user_name;

  const tokenName = access_token.replace(/\W/g, '');
  const startingDirectory = process.env.STARTINGDIRECTORY;
  const directory = `${tokenName}-${timestamp}`;

  let script;
  let sfdxurl;

  switch (command) {

    case 'clone':

      const insertQuery = `INSERT INTO deployments (username, repo) VALUES ('${user_name}', '${param}')`;

      postgresHelper.insertDeployment(insertQuery).then((result) => {

        script = `${startingDirectory}mkdir ${directory};cd ${directory};git clone ${param} .`;

        commands.run(command, script, () => {
          res.json({
            message: `Successfully cloned ${param}`
          });
        });
      });

      break;

    case 'auth':

      sfdxurl = `echo "force://${consumerKey}:${consumerSecret}:${refresh_token}@${instance_url}" > sfdx.key`;
      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;${sfdxurl};sfdx force:auth:sfdxurl:store -f sfdx.key -d`;

      commands.run(command, script, () => {
        res.json({
          message: `Authenticated to dev hub using ${user_name}.`
        });
      });

      break;

    case 'create':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${instance_url}`;

      commands.run(command, script, () => {

        script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:org:create -v '${access_token}' -s -f ${param}`;

        commands.run(command, script, (result) => {

          let output = result;
          output = output.replace(/\r?\n|\r/, ''); // remove newline
          output = output.trim();

          res.json({
            message: `${output}.`
          });
        });
      });

      break;

    case 'push':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:source:push --json | jq '.result.pushedSource | length'`;

      commands.run(command, script, (result) => {

        let output = result;
        output = output.replace(/\r?\n|\r/, ''); // remove newline
        output = output.trim();

        res.json({
          message: `Pushed ${output} source files.`
        });
      });

      break;

    case 'permset':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:user:permset:assign -n ${param}`;

      commands.run(command, script, () => {
        res.json({
          message: `Permset '${param}' assigned.`
        });
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

      commands.run(command, script, (result) => {

        let output = result;
        output = output.replace(/\r?\n|\r/, ''); // remove newline
        output = output.trim();

        res.json({
          message: `Apex tests: ${output}.`
        });
      });

      break;

    case 'url':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;echo $(sfdx force:org:display --json | jq -r .result.instanceUrl)"/secur/frontdoor.jsp?sid="$(sfdx force:org:display --json | jq -r .result.accessToken)`;

      commands.run(command, script, (result) => {
        res.json({
          message: `${result}`
        });
      });

      break;

    case 'clean':

      script = `${startingDirectory}rm -rf ${directory}`;

      commands.run(command, script, () => {
        res.json({
          message: 'Removed temp files and cleaned up.'
        });
      });

      break;
  }
});

app.use('/api', router);


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});