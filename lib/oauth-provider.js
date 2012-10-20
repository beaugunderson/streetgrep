var oauth2orize = require('oauth2orize');
var passport = require('passport');
var login = require('connect-ensure-login');

var models = require('models');

var server = oauth2orize.createServer();

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid(len) {
  var buf = [];
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
}

// Serialize the User by its ID
server.serializeClient(function(client, done) {
  return done(null, client.id);
});

// Deserialize the User by its ID
server.deserializeClient(function(id, done) {
  models.Client.find({ where: { id: id } }).success(function(client) {
    done(null, client);
  }).error(function(err) {
    done(err);
  });
});

// Register support for code grants
server.grant(oauth2orize.grant.code(function(client, redirectUri, user, ares, done) {
  var code = uid(16);

  models.AuthorizationCode.create({
    code: code,
    redirectUri: redirectUri,
    UserId: user.id,
    ClientId: client.id
  }).success(function() {
    done(null, code);
  }).error(function(err) {
    done(err);
  });
}));

// Exchange authorization codes for access tokens
server.exchange(oauth2orize.exchange.code(function(client, code, redirectUri, done) {
  models.AuthorizationCode.find({ where: { code: code } }).success(function(authorizationCode) {
    if (client.id !== authorizationCode.ClientId) {
      return done(null, false);
    }

    console.log('"' + redirectUri + '" === "' + authorizationCode.redirectUri + '"');

    // XXX: What needs to be validated here?
    //if (redirectUri !== authorizationCode.redirectUri) {
    //  return done(null, false);
    //}

    var token = uid(256);

    models.AccessToken.create({
      token: token,
      UserId: authorizationCode.UserId,
      ClientId: authorizationCode.ClientId
    }).success(function() {
      done(null, token);
    }).error(function(err) {
      done(err);
    });
  }).error(function(err) {
    done(err);
  });
}));

// User authorization endpoint
exports.authorization = [
  login.ensureLoggedIn(),
  server.authorization(function(clientID, redirectUri, done) {
    models.Client.find({ where: { clientId: clientID } }).success(function(client) {
      if (!client) {
        return done(null, false);
      }

      // WARNING: For security purposes, it is highly advisable to check that
      //          redirectUri provided by the client matches one registered with
      //          the server.  For simplicity, this example does not.  You have
      //          been warned.
      done(null, client, redirectUri);
    }).error(function(err) {
      done(err);
    });
  }),
  function(req, res) {
    res.render('dialog', {
      transactionID: req.oauth2.transactionID,
      user: req.user,
      client: req.oauth2.client
    });
  }
];

exports.decision = [
  login.ensureLoggedIn(),
  server.decision()
];

exports.token = [
  passport.authenticate(['basic', 'oauth2-client-password'], {
    session: false
  }),
  server.token(),
  server.errorHandler()
];
