var express = require('express');
var fs = require('fs');
var partials = require('express-partials');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;

var Resource = require('express-resource');
var MongoStore = require('connect-mongo')(express);
var OAuth2 = require('oauth').OAuth2;

var models = require('./models');

var API_URL = 'https://api.singly.com';
var HOST_URL = 'http://streetgrep.com';

var PORT = 8048;

var config = JSON.parse(fs.readFileSync('config.json'));

var app = express();

// Generate a Singly authorization link
function authorizationLink(req) {
  return function(service, name) {
    if (req && req.session && req.session.profiles &&
      req.session.profiles[service] !== undefined) {
      return '<span class="check">&#10003;</span> ' + name;
    }

    return sprintf('<a href="%s/oauth/authorize?%s">%s</a>',
      API_URL,
      querystring.stringify({
        client_id: config.singly.clientId,
        redirect_uri: HOST_URL + "/auth/singly/auth",
        service: service
      }),
      name);
  };
}

// Make the authorizationLink function available to templates; we use a
// middleware because it depends on the profiles in the user's session.
app.use(function(req, res, next) {
  res.locals.authorizationLink = authorizationLink(req);
  next();
});

// Setup for the express web framework
app.configure(function() {
  app.set('view engine', 'ejs');
  app.engine('html', require('ejs').renderFile);
  app.use(partials());
  app.use(express.logger());
  app.use(express['static'](__dirname + '/public'));
  app.use(express.bodyParser({
    uploadDir: __dirname + '/tmp',
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

app.get('/upload', function(req, res) {
  res.render('upload');
});

var users = app.resource('users', require('./resources/users'), {
  load: models.User.loadUser,
  format: 'html'
});

var photos = app.resource('photos', require('./resources/photos'), {
  load: models.Photo.loadPhoto,
  format: 'html'
});

app.get('/profile', function(req, res) {
  res.render('profile');
});

// users.add(photos);

app.get('/user/:user/photos', function(req, res) {
  if (req.params.user === 'me') {
    // Get the user's ID
    req.params.user = '';
  }
});

// Singly integration
var oa = new OAuth2(config.singly.clientId, config.singly.clientSecret,
  API_URL);

// A convenience method that takes care of adding the access token to requests
function getProtectedResource(path, session, callback) {
  oa.getProtectedResource(API_URL + path, session.access_token, callback);
}

// The callback that ends the OAuth2 flow from Singly
app.get('/auth/singly/auth', function(req, res) {
  var data = {
    client_id: config.singly.clientId,
    client_secret: config.singly.clientSecret,
    code: req.param('code')
  };

  request.post({
    uri: sprintf('%s/oauth/access_token', API_URL),
    body: querystring.stringify(data),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, function(err, postRes, body) {
    try {
      body = JSON.parse(body);
    } catch(parseErr) {
      console.error('Parse error: ' + parseErr);
      console.error('body: ' + body);

      return res.redirect(HOST_URL + '/');
    }

    req.session.access_token = body.access_token;

    // Find the user, then create or update it
    models.User.find({ where: { singlyId: body.account } }).success(function(user) {
      // TODO: Create a pattern for this?
      if (user) {
        user.updateAttributes({
          singlyAccessToken: body.access_token
        });
      } else {
        models.User.create({
          singlyId: body.account,
          singlyAccessToken: body.access_token
        });
      }
    });

    // Load the user's profiles into the session
    getProtectedResource('/profiles', req.session, function(err, profilesBody) {
      try {
        profilesBody = JSON.parse(profilesBody);

        req.session.profiles = profilesBody;
      } catch(parseErr) {
      }

      res.redirect(HOST_URL + '/');
    });
  });
});

models.init(function() {
  console.log('Listening on ' + PORT);

  app.listen(PORT);
});
