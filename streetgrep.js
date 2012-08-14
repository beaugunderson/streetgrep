var express = require('express');
var Sequelize = require('sequelize');
var MongoStore = require('connect-mongo')(express);

var PORT = 8048;

var config = {
  sessionSecret: 'streetgrep-secret'
};

var sequelize = new Sequelize('database', 'username', 'password', {
  dialect: 'mysql',
  storage: 'streetgrep.sqlite'
});

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

app.get('/photos/:id', function(req, res) {
  if (!req.params.id) {
    return res.error(500);
  }
});

app.get('/photos', function(req, res) {

});

app.post('/photos', function(req, res) {

});

app.listen(PORT);
