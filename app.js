var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use('/scripts', express.static(__dirname + '/scripts'));

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  res.render('pages/index', {});
});

app.get('/about', function (req, res) {
  res.render('pages/about');
});

app.get('/deploy', function (req, res) {
  const template = req.query.template;
  res.render('pages/deploy', {
    template: template
  });
});

app.get('/deploying', function (req, res) {
  const template = req.query.template;
  res.render('pages/deploying', {
    template: template
  });
});

var port = process.env.PORT || 8080;

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});
