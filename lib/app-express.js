const oauth2 = require('salesforce-oauth2');
const jsforce = require('jsforce');
const postgresHelper = require('./postgres.js');

const callbackUrl = process.env.CALLBACKURL;
const consumerKey = process.env.CONSUMERKEY;
const consumerSecret = process.env.CONSUMERSECRET;

const allowHostedOneClick = process.env.HOSTED_ONE_CLICK || false; // default for original flavor.
let conn;

module.exports = function (app) {

  app.get('*', (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      res.redirect(`https://deploy-to-sfdx.com${req.url}`);
    }

    return next();
  });

  app.get('/hostedOneClick', (req, res) => {
    // feature not active--send you to the homepage
    console.log('oneClick requested');
    const template = req.query.template;
    if (!allowHostedOneClick){
      console.log('OneClick deploy not allowed');
      res.render('pages/customError', {
        customError : 'This version of the app is not set up for 1-click deployment.  It\'s a permission thing'
      });
    } else if (!template){
      // no template?
      res.render('pages/customError', {
        customError : 'You have to include a template in the link.  Example: ?template=https://github.com/mshanemc/LightningErrorHandler'
      });
    } else if (!conn){
      // if the app hasn't been logged in, someone needs to do it to get things started
      console.log('no tokens yet.  Sending you to /loginPermanent');
      return res.redirect(`/permanentLogin?template=${template}`);
    } else if (conn.refreshToken){
      // use the refresh token to get a current accessToken for each run, just in case
      const o = new jsforce.OAuth2(conn.oauth2);
      o.refreshToken(conn.refreshToken, (err, tokenResp) => {
        if (err){
          console.log(err);
        } else {
          console.log(tokenResp);
          conn.accessToken = tokenResp.access_token;
          return res.redirect(`/deploying?template=${req.query.template}`);
        }
      });
    }
  });


  app.get('/', (req, res) => {
    postgresHelper.getDeploymentCount().then((deploymentCountResult) => {

      const deploymentCount = deploymentCountResult.rows[0].count;
      const template = req.query.template;
      const referrer = req.headers.referer;

      res.render('pages/index', {
        deploymentCount: deploymentCount,
        template: template ? template :
          referrer && referrer.startsWith('https://github.com') ? referrer : null
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
        if (template) {
          return res.redirect(`/login?template=${template}`);
        } else {
          return res.redirect('/login');
        }
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

  app.get('/hubLinked', (req, res) => {
    res.render('pages/hubLinked', {
      username : req.cookies.user_name
    });
  });

  app.get('/permanentLogin', (req, res) => {
    const template = req.query.template;

    const uri = oauth2.getAuthorizationUrl({
      redirect_uri: callbackUrl,
      client_id: consumerKey,
      scope: 'id api openid refresh_token',
      state: template,
      prompt: 'select_account'
    });

    return res.redirect(uri);
  });

  app.get('/logout', (req, res) => {
    const access_token = req.cookies.access_token;
    const instance_url = req.cookies.instance_url;

    conn = new jsforce.Connection({
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

    console.log(`template is ${template}`);

    oauth2.authenticate({
      redirect_uri: callbackUrl,
      client_id: consumerKey,
      client_secret: consumerSecret,
      code: authorizationCode
    }, (error, payload) => {

      try {
        console.log(payload);
        res.cookie('access_token', payload.access_token);
        res.cookie('instance_url', payload.instance_url);

      } catch (tokenErr) {
        console.log('payload.access_token undefined', tokenErr);

        return res.redirect('/error');
      }

      // check to see if org is a dev hub
      let connLocal = new jsforce.Connection({
        instanceUrl: payload.instance_url,
        accessToken: payload.access_token
      });

      connLocal.identity((err, identity) => {
        if (err) {
          return console.error(err);
        }
        console.log(identity);

        res.cookie('user_name', identity.username);

        connLocal.tooling.query("SELECT DurableId, SettingValue FROM OrganizationSettingsDetail WHERE SettingName = 'ScratchOrgManagementPref'", (devHubErr, result) => {
          if (devHubErr) {
            return console.error(devHubErr);
          }
          console.log(result);
          if (result.size > 0) {
            const devHubEnabled = result.records[0].SettingValue;

            if (devHubEnabled === true) {

              // you authenticated against and got back a refesh token.  That's the one-click thing!
              if (payload.refresh_token && allowHostedOneClick && template){
                console.log('setting super-conn');
                conn = {};
                conn.refreshToken = payload.refresh_token;
                conn.accessToken = payload.access_token;
                conn.instanceUrl = payload.instance_url;
                conn.oauth2 = {
                  clientId : consumerKey,
                  clientSecret : consumerSecret,
                  redirectUri : callbackUrl
                };
                if (template !== 'init'){
                  console.log('redirecting to deploying');
                  return res.redirect(`/deploying?template=${template}`);
                } else {
                  console.log('Dev Hub Linked!');
                  return res.redirect('/hubLinked');
                }
              }

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