var express = require('express');
var fs = require('fs');
var login = require('connect-ensure-login');
var partials = require('express-partials');
var passport = require('passport');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;

var Resource = require('express-resource');
var MongoStore = require('connect-mongo')(express);
var OAuth2 = require('oauth').OAuth2;

var models = require('./models');
var streetgrepOAuth = require('./streetgrep-oauth');

var API_URL = 'https://api.singly.com';
var HOST_URL = 'https://streetgrep.com';

var PORT = 8048;

var SINGLY_APP_ID = process.env.SINGLY_APP_ID;
var SINGLY_APP_SECRET = process.env.SINGLY_APP_SECRET;

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
        client_id: SINGLY_APP_ID,
        redirect_uri: HOST_URL + "/auth/singly",
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
  app.set('basepath', HOST_URL);
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
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
      db: 'streetgrep-sessions'
    })
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

/* OAuth2 login */
app.get('/login', function(req, res, next) {
  res.render('login');
});

var RED = '\u001b[31m';
var RESET = '\u001b[0m';

app.get('/auth/singly', function(req, res, next) {
  console.log(RED, 'calling passport.authenticate from /auth/singly', RESET);

  passport.authenticate('singly', { service: req.param('service') },
    function(err, user, info) {
    if (err) {
      console.log(RED, 'err', err, RESET);

      return next(err);
    }

    console.log(RED, 'user', user, RESET);

    if (!user) {
      return res.redirect('/auth/singly?service=' + req.param('service'));
    }

    req.logIn(user, function(err) {
      if (err) {
        console.log(RED, 'err', err, RESET);

        return next(err);
      }

      return res.redirect('/');
    });
  })(req, res, next);
});

app.get('/auth/singly/callback',
  passport.authenticate('singly', { failureRedirect: '/login' }),
  function(req, res) {
    console.log(RED, 'authenticate from /auth/singly/callback', RESET);

    res.redirect('/');
  }
);

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/profile', [
  login.ensureLoggedIn(),
  function(req, res) {
    res.render('profile', { user: req.user });
  }
]);

/* OAuth2 provider */
require('./auth');

app.get('/oauth/authorize', streetgrepOAuth.authorization);
app.post('/oauth/authorize/decision', streetgrepOAuth.decision);

app.post('/oauth/access_token', streetgrepOAuth.token);

app.get('/user/info', [
  passport.authenticate('bearer', { session: false }),
  function(req, res) {
    // req.authInfo is set using the `info` argument supplied by
    // `BearerStrategy`.  It is typically used to indicate scope of the token,
    // and used in access control checks.  For illustrative purposes, this
    // example simply returns the scope in the response.
    res.json({
      user_id: req.user.id,
      name: req.user.name,
      scope: req.authInfo.scope
    });
  }
]);
/* End OAuth2 provider */

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

// users.add(photos);

app.get('/user/:user/photos', function(req, res) {
  if (req.params.user === 'me') {
    // Get the user's ID
    req.params.user = '';
  }
});

/*
// Singly integration
var oa = new OAuth2(SINGLY_APP_ID, SINGLY_APP_SECRET,
  API_URL);

// A convenience method that takes care of adding the access token to requests
function getProtectedResource(path, session, callback) {
  oa.getProtectedResource(API_URL + path, session.access_token, callback);
}

// The callback that ends the OAuth2 flow from Singly
app.get('/auth/singly/auth', function(req, res) {
  var data = {
    client_id: SINGLY_APP_ID,
    client_secret: SINGLY_APP_SECRET,
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
*/

models.init(function() {
  console.log('Listening on ' + PORT);

  app.listen(PORT);
});
