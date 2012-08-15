var express = require('express');
var fs = require('fs');
var querystring = require('querystring');

var Resource = require('express-resource');
var MongoStore = require('connect-mongo')(express);
var OAuth2 = require('oauth').OAuth2;

var models = require('./models');

var API_BASE_URL = 'https://api.singly.com';
var HOST_BASE_URL = 'http://streetgrep.com';

var PORT = 8048;

var config = JSON.parse(fs.readFileSync('config.json'));

// Create an HTTP server
var app = express.createServer();

// Setup for the express web framework
app.configure(function() {
  app.set('view engine', 'ejs');

  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser({
    uploadDir: __dirname + '/../../apps/tmp',
    keepExtensions: true
  }));
  app.use(express.limit('16mb'));
  app.use(express.cookieParser());
  app.use(express.session({
    secret: config.sessionSecret,
    store: new MongoStore({
      db: 'streetgrep-sessions'
    })
  }));
  app.use(app.router);
});

// We want exceptions and stracktraces in development
app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

// ... but not in production
app.configure('production', function() {
  app.use(express.errorHandler());
});

app.get('/', function(req, res) {
  res.render('index');
});

var users = app.resource('users', require('./resources/users'));
var photos = app.resource('photos', require('./resources/photos'));

// users.add(photos);

app.get('/profile', function(req, res) {
  res.render('profile');
});

app.get('/user/:user/photos', function(req, res) {
  if (req.params.user === 'me') {
    // Get the user's ID
    req.params.user = '';
  }
});

// Singly integration
var oa = new OAuth2(config.singly.clientId, config.singly.clientSecret, API_BASE_URL);

// A convenience method that takes care of adding the access token to requests
function getProtectedResource(path, session, callback) {
   oa.getProtectedResource(API_BASE_URL + path, session.access_token, callback);
}

app.get('/auth/singly/auth', function(req, res) {
  var data = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: req.param('code')
  };

  request.post({
    uri: sprintf('%s/oauth/access_token', API_BASE_URL),
    body: querystring.stringify(data),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, function(err, postRes, body) {
    try {
      body = JSON.parse(body);
    } catch(parseErr) {
      return res.redirect(HOST_BASE_URL + '/');
    }

    req.session.access_token = body.access_token;

    res.redirect(HOST_BASE_URL + '/');
  });
});

app.listen(PORT);
