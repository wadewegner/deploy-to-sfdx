const oauth2 = require('salesforce-oauth2');
const jsforce = require('jsforce');
const postgresHelper = require('./postgres.js');

const callbackUrl = process.env.CALLBACKURL;
const consumerKey = process.env.CONSUMERKEY;
const consumerSecret = process.env.CONSUMERSECRET;

module.exports = function (app) {

  app.get('*', (req, res, next) => {

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

  app.get('/error', (req, res) => {
    res.render('pages/error');
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

  app.get('/repo', (req, res) => {
    res.render('pages/repo', {});
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

  app.get('/login', (req, res) => {
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
    const template = req.param('state');

    oauth2.authenticate({
      redirect_uri: callbackUrl,
      client_id: consumerKey,
      client_secret: consumerSecret,
      code: authorizationCode
    }, (error, payload) => {

      try {

        res.cookie('access_token', payload.access_token);
        res.cookie('instance_url', payload.instance_url);

      } catch (tokenErr) {
        console.log('payload.access_token undefined', tokenErr);

        return res.redirect('/error');
      }

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

        conn.tooling.query("SELECT DurableId, SettingValue FROM OrganizationSettingsDetail WHERE SettingName = 'ScratchOrgManagementPref'", (devHubErr, result) => {
          if (devHubErr) {
            return console.error(devHubErr);
          }

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
};