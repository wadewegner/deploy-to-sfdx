const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sleep = require('sleep');
var cookieParser = require('cookie-parser')
const {
  exec
} = require('child_process');
const oauth2 = require('salesforce-oauth2');

const callbackUrl = process.env.CALLBACKURL;
const consumerKey = process.env.CONSUMERKEY;
const consumerSecret = process.env.CONSUMERSECRET;

app.use('/scripts', express.static(__dirname + '/scripts'));

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(cookieParser());

app.get('/', function (req, res) {
  res.render('pages/index', {});
});

app.get('/about', function (req, res) {
  res.render('pages/about');
});

app.get('/deploy', function (req, res) {
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

app.get('/deploying', function (req, res) {
  const template = req.query.template;
  res.render('pages/deploying', {
    template: template
  });
});

app.get("/login", function (req, res) {
  var uri = oauth2.getAuthorizationUrl({
    redirect_uri: callbackUrl,
    client_id: consumerKey,
    scope: 'id api refresh_token openid',
    state: 'test123'
    // You can change loginUrl to connect to sandbox or prerelease env.
    //base_url: 'https://test.my.salesforce.com'
  });
  return res.redirect(uri);
});

app.get('/logout', function (req, res) {
  res.clearCookie('access_token');
  res.clearCookie('instance_url');

  return res.redirect('/');
});

app.get('/oauth/callback', function (req, res) {
  const authorizationCode = req.param('code');
  const state = req.param('state');
  console.log('state', state);

  oauth2.authenticate({
    redirect_uri: callbackUrl,
    client_id: consumerKey,
    client_secret: consumerSecret,
    code: authorizationCode
  }, function (error, payload) {

    res.cookie('access_token', payload.access_token);
    res.cookie('instance_url', payload.instance_url);
    res.cookie('refresh_token', payload.refresh_token);
    res.cookie('user_name', payload.id);

    console.log(payload);

    const template = req.cookies.template;
    return res.redirect(`/deploy?template=${template}`);
  });
});

var router = express.Router();

router.post('/deploying', function (req, res) {

  var command = req.body.command;
  var param = req.body.param;

  const access_token = req.cookies.access_token;
  const instance_url = req.cookies.instance_url;
  const refresh_token = req.cookies.refresh_token;

  if (command === 'clone') {

    exec(`cd /tmp;mkdir test;cd test;git clone ${param} repo`, (err, stdout, stderr) => {
      res.json({
        message: `Successfully cloned ${param}`
      });
    });

  }

  if (command === 'auth') {

    const sfdxurl = `echo "force://${consumerKey}:${consumerSecret}:${refresh_token}@${instance_url}" > sfdx.key`;
    const commandScript = `cd /tmp/test/repo;export FORCE_SHOW_SPINNER=;${sfdxurl};sfdx force:auth:sfdxurl:store -f sfdx.key -d`;
    console.log('auth', commandScript);

    exec(commandScript, (err, stdout, stderr) => {
      console.log('create:stderr', stderr);
      res.json({
        message: `Authenticated to dev hub: ${stdout}`
      });
    });
  }

  if (command === 'create') {

    const commandScript = `cd /tmp/test/repo;export FORCE_SHOW_SPINNER=;sfdx force:org:create -s -f ${param}`;
    console.log('create', commandScript);

    exec(commandScript, (err, stdout, stderr) => {
      console.log('create:stderr', stderr);
      res.json({
        message: `Created scratch org: ${stdout}`
      });
    });
  }

  if (command === 'push') {
    exec(`cd /tmp/test/repo;export FORCE_SHOW_SPINNER=;sfdx force:source:push`, (err, stdout, stderr) => {
      res.json({
        message: `Pushed source:\n\t${stdout}`
      });
    });
  }

  if (command === 'test') {
    exec(`cd /tmp/test/repo;export FORCE_SHOW_SPINNER=;sfdx force:apex:test:run -r human --json | jq -r .result | jq -r .summary | jq -r .outcome`, (err, stdout, stderr) => {
      res.json({
        message: `Apex tests: ${stdout}`
      });
    });
  }

  if (command === 'url') {
    const commandScript = 'cd /tmp/test/repo;export FORCE_SHOW_SPINNER=;echo $(sfdx force:org:display --json | jq -r .result | jq -r .instanceUrl)"/secur/frontdoor.jsp?sid="$(sfdx force:org:display --json | jq -r .result | jq -r .accessToken)';

    exec(commandScript, (err, stdout, stderr) => {
      res.json({
        message: `${stdout}`
      });
    });
  }

  if (command === 'clean') {

    const commandScript = 'rm -rf /tmp/test';
    exec(commandScript, (err, stdout, stderr) => {
      res.json({
        message: 'Removed temp files and cleaned up'
      });
    });
  }

});

app.use('/api', router);

var port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});