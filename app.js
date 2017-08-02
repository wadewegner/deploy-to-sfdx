const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const oauth2 = require('salesforce-oauth2');
const jsforce = require('jsforce');
const commands = require('./lib/commands.js');

const {
  exec
} = require('child_process');

const app = express();

const callbackUrl = process.env.CALLBACKURL;
const consumerKey = process.env.CONSUMERKEY;
const consumerSecret = process.env.CONSUMERSECRET;

app.use('/scripts', express.static(`${__dirname}/scripts`));

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(cookieParser());

app.get('/', (req, res) => {
  res.render('pages/index', {});
});

app.get('/about', (req, res) => {
  res.render('pages/about');
});

app.get('/notdevhub', (req, res) => {
  const template = req.query.template;
  res.cookie('template', template);

  const user_name = req.cookies.user_name;

  res.render('pages/notdevhub', {
    template: template,
    user_name: user_name
  });
});

app.get('/deploy', (req, res) => {
  const template = req.query.template;

  res.cookie('template', template);

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
  const uri = oauth2.getAuthorizationUrl({
    redirect_uri: callbackUrl,
    client_id: consumerKey,
    scope: 'id api refresh_token openid',
    state: 'test123'
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
  // const state = req.param('state'); // TODO: use state and query instead of cookies

  oauth2.authenticate({
    redirect_uri: callbackUrl,
    client_id: consumerKey,
    client_secret: consumerSecret,
    code: authorizationCode
  }, (error, payload) => {

    res.cookie('access_token', payload.access_token);
    res.cookie('instance_url', payload.instance_url);
    res.cookie('refresh_token', payload.refresh_token);

    console.log(payload);

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

        const template = req.cookies.template;

        if (result.size > 0) {
          const devHubEnabled = result.records[0].SettingValue;

          if (devHubEnabled === true) {
            return res.redirect(`/deploy?template=${template}`);
          } else {
            return res.redirect(`/notdevhub?template=${template}`);
          }
        } else {
          return res.redirect(`/notdevhub?template=${template}`);
        }
      });
    });
  });
});

const router = express.Router();

router.get('/test', (req, res) => {

  const script = `jq --help`;

  commands.run('test', script, (result) => {
    console.log('temp result', result);
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

  const tokenName = access_token.replace(/\W/g, '');
  const startingDirectory = process.env.STARTINGDIRECTORY;
  const directory = `${tokenName}-${timestamp}`;

  const jqDirectory = '/app/.local/share/jq/bin/';

  let script;
  let sfdxurl;

  switch (command) {

    case 'clone':

      script = `${startingDirectory}mkdir ${directory};cd ${directory};git clone ${param} .`;

      commands.run(command, script, (result) => {
        console.log('temp result', result);
        res.json({
          message: `Successfully cloned ${param}`
        });
      });

      break;

    case 'auth':

      sfdxurl = `echo "force://${consumerKey}:${consumerSecret}:${refresh_token}@${instance_url}" > sfdx.key`;
      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;${sfdxurl};sfdx force:auth:sfdxurl:store -f sfdx.key -d`;

      commands.run(command, script, (result) => {
        res.json({
          message: `Authenticated to dev hub: ${result}`
        });
      });

      break;

    case 'create':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${instance_url};sfdx force:org:create -v '${access_token}' -s -f ${param}`;

      commands.run(command, script, (result) => {
        res.json({
          message: `Created scratch org: ${result}`
        });
      });

      break;

    case 'push':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:source:push`;

      commands.run(command, script, (result) => {
        res.json({
          message: `Pushed source:\n\t${result}`
        });
      });

      break;

    case 'test':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:apex:test:run -r human --json | ${jqDirectory}jq -r .result | ${jqDirectory}jq -r .summary | ${jqDirectory}jq -r .outcome`;

      commands.run(command, script, (result) => {
        res.json({
          message: `Apex tests: ${result}`
        });
      });

      break;

    case 'url':

      script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;echo $(sfdx force:org:display --json | ${jqDirectory}jq -r .result | ${jqDirectory}jq -r .instanceUrl)"/secur/frontdoor.jsp?sid="$(sfdx force:org:display --json | ${jqDirectory}jq -r .result | ${jqDirectory}jq -r .accessToken)`;

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
          message: 'Removed temp files and cleaned up'
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