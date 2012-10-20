var passport = require('passport');

var BasicStrategy = require('passport-http').BasicStrategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var SinglyStrategy = require('passport-singly').Strategy;

var models = require('models');

passport.use(new SinglyStrategy({
    clientID: process.env.SINGLY_APP_ID,
    clientSecret: process.env.SINGLY_APP_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    models.User.find({ where: { singlyId: profile.id } }).success(function(user) {
      // TODO: Create a pattern for this?
      if (user) {
        user.updateAttributes({
          singlyAccessToken: accessToken
        }).success(function(user) {
          done(null, user);
        }).error(function(err) {
          done(err);
        });
      } else {
        models.User.create({
          singlyId: profile.id,
          singlyAccessToken: accessToken
        }).success(function(user) {
          done(null, user);
        }).error(function(err) {
          done(err);
        });
      }
    }).error(function(err) {
      done(err);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  models.User.find({ where: { id: id } }).success(function(user) {
    done(null, user);
  }).error(function(err) {
    done(err);
  });
});

/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients.  They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens.  The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate.  Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header).  While this approach is not recommended by
 * the specification, in practice it is quite common.
 */
passport.use(new BasicStrategy(
  function(username, password, done) {
    models.Client.find({ where: { clientId: username } }).success(function(client) {
      if (client.clientSecret !== password) {
        return done(null, false);
      }

      done(null, client);
    }).error(function(err) {
      done(err);
    });
  }
));

passport.use(new ClientPasswordStrategy(
  function(clientId, clientSecret, done) {
    console.log('--- CLIENT PASSWORD STRATEGY ---', clientId, clientSecret);

    models.Client.find({ where: { clientId: clientId } }).success(function(client) {
      if (!client) {
        return done(null, false);
      }

      if (client.clientSecret !== clientSecret) {
        return done(null, false);
      }

      done(null, client);
    }).error(function(err) {
      done(err);
    });
  }
));

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate users based on an access token (aka a
 * bearer token).  The user must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 */
passport.use(new BearerStrategy(
  function(accessToken, done) {
    models.AccessToken.find({ where: { token: accessToken } }).success(function(token) {
      if (!token) {
        return done();
      }

      models.User.find({ where: { id: token.UserId } }).success(function(user) {
        // To keep this example simple, restricted scopes are not implemented,
        // and this is just for illustrative purposes
        var info = { scope: '*' };

        done(null, user, info);
      }).error(function(err) {
        done(err);
      });
    }).error(function(err) {
      done(err);
    });
  }
));
