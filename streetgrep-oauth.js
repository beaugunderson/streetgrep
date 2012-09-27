var oauth2orize = require('oauth2orize');
var passport = require('passport');
var login = require('connect-ensure-login');

var utils = require('./utils');
var models = require('./models');

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.
server.serializeClient(function(client, done) {
  return done(null, client.id);
});

server.deserializeClient(function(id, done) {
  models.Client.find({ where: { id: id } }).success(function(client) {
    done(null, client);
  }).error(function(err) {
    done(err);
  });
});

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources.  It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes.  The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a code, which is bound to these
// values, and will be exchanged for an access token.
server.grant(oauth2orize.grant.code(function(client, redirectUri, user, ares, done) {
  var code = utils.uid(16);

  models.AuthorizationCode.create({
    code: code,
    clientId: client.id,
    redirectUri: redirectUri,
    userId: user.id
  }).success(function() {
    done(null, code);
  }).error(function(err) {
    done(err);
  });
}));

// Exchange authorization codes for access tokens.  The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification.  If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.
server.exchange(oauth2orize.exchange.code(function(client, code, redirectUri, done) {
  console.log('--- EXCHANGE ---', code, redirectUri);

  models.AuthorizationCode.find({ where: { code: code } }).success(function(authorizationCode) {
    if (client.id !== authorizationCode.ClientId) {
      console.log('"' + client.id + '" !== "' + authorizationCode.ClientId + '"');
      console.log(typeof client.id, typeof authorizationCode.ClientId);

      return done(null, false);
    }

    console.log('"' + redirectUri + '" === "' + authorizationCode.redirectUri + '"');

    // XXX: What needs to be validated here?
    //if (redirectUri !== authorizationCode.redirectUri) {
    //  return done(null, false);
    //}

    var token = utils.uid(256);

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

// user authorization endpoint
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request.  In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary accross
// implementations.  Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction.  It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization).  We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.
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

// user decision endpoint
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application.  Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.
exports.decision = [
  login.ensureLoggedIn(),
  server.decision()
];

// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.
exports.token = [
  passport.authenticate(['basic', 'oauth2-client-password'], {
    session: false
  }),
  server.token(),
  server.errorHandler()
];
