const oauth2 = require('salesforce-oauth2');
const jsforce = require('jsforce');
const Guid = require('guid');
const postgresHelper = require('../lib/postgres');

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

      const deploymentCount = parseInt(deploymentCountResult.rows[0].count);
      const template = req.query.template;
      const referrer = req.headers.referer;

      res.render('pages/index', {
        deploymentCount,
        template: template ? template : referrer && referrer.startsWith('https://github.com') ? referrer : null
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
      template,
      user_name
    });
  });

  app.get('/choose', (req, res) => {
    const user_name = req.cookies.user_name;
    const guid = Guid.raw();

    postgresHelper.getChoices()
      .then((result) => {

        res.render('pages/choose', {
          user_name,
          guid,
          rows: result.rows
        });
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
    const guid = Guid.raw();

    if (access_token && instance_url) {
      res.render('pages/deploy', {
        template,
        access_token,
        instance_url,
        user_name,
        guid
      });
    } else {
      if (template) {
        return res.redirect(`/login?template=${template}`);
      } else {
        return res.redirect('/login');
      }
    }
  });

  app.get('/deploying', (req, res) => {
    const template = req.query.template;
    const guid = req.query.guid;

    res.render('pages/deploying', {
      template,
      guid
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
        console.error('payload.access_token undefined', tokenErr);

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
              return res.redirect(template ? `/notdevhub?template=${template}` : '/notdevhub');
            }
          } else {
            return res.redirect(template ? `/notdevhub?template=${template}` : '/notdevhub');
          }
        });
      });
    });
  });
};