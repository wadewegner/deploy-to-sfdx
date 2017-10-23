const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const https = require('https');

const app = express();
const router = express.Router();

app.use('/scripts', express.static(`${__dirname}/scripts`));
app.use('/dist', express.static(`${__dirname}/dist`));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(cookieParser());

require('./lib/web')(app);
require('./lib/apis')(router);

app.use('/api', router);

const port = process.env.PORT || 8443;

// if local, use 8443 and certificate
if (process.env.NODE_ENV === 'dev') {

  const passPhrase = process.env.PASS_PHRASE;
  const certPem = process.env.CERT_PEM.replace(/\\n/g, '\n');
  const keyPem = process.env.KEY_PEM.replace(/\\n/g, '\n');

  const sslOptions = {
    key: keyPem,
    cert: certPem,
    passphrase: passPhrase
  };

  const httpsServer = https.createServer(sslOptions, app);
  
  httpsServer.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
  });

} else {

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
  });

}