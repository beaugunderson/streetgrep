var bugsnag = require('bugsnag');
var express = require('express');
var login = require('connect-ensure-login');
var partials = require('express-partials');
var passport = require('passport');

var MongoStore = require('connect-mongo')(express);

var models = require('models');
var streetgrepOAuth = require('oauth-provider');

require('passport-strategies');

var app = express();

app.set('view engine', 'ejs');
app.set('basepath', process.env.HOST_URL);

app.engine('html', require('ejs').renderFile);

app.use(bugsnag.register("be3cb308eb2b65c34cd1e9620ffcde49"));

app.use(partials());

app.use(express.logger());
app.use(express.compress());
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

/* OAuth2 login */
app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/auth/singly', passport.authenticate('singly'));

app.get('/auth/singly/callback', passport.authenticate('singly', {
  failureRedirect: '/login',
  successReturnToOrRedirect: '/'
}));

/* OAuth2 provider */
app.get('/oauth/authorize', streetgrepOAuth.authorization);
app.post('/oauth/authorize/decision', streetgrepOAuth.decision);

app.post('/oauth/access_token', streetgrepOAuth.token);

app.get('/user/info', [
  passport.authenticate('bearer', { session: false }),
  function (req, res) {
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
app.configure('development', function () {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

// ... but not in production
app.configure('production', function () {
  app.use(express.errorHandler());
});

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/profile', [
  login.ensureLoggedIn(),
  function (req, res) {
    res.redirect('/users/' + req.user.id);
  }
]);

app.use('/users', require('./resources/users'));
app.use('/photos', require('./resources/photos'));

// Mount the API endpoints
app.use('/api/v0/users', require('./resources/users'));
app.use('/api/v0/photos', require('./resources/photos'));

// Secure the API endpoints with an access token
app.all('/api/v0/*', passport.authenticate('bearer', { session: false }));

models.init(function () {
  console.log('Listening on ' + process.env.PORT);

  app.listen(process.env.PORT);
});
