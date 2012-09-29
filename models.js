var async = require('async');
var Sequelize = require('sequelize');

var db = new Sequelize('database', 'username', 'password', {
  dialect: 'sqlite',
  storage: 'streetgrep.sqlite'
});

var Client = db.define('Client', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  clientId: {
    type: Sequelize.STRING,
    allowNull: false
  },
  clientSecret: {
    type: Sequelize.STRING,
    allowNull: false
  }
});

var AccessToken = db.define('AccessToken', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  token: {
    type: Sequelize.STRING,
    allowNull: false
  }
});

var AuthorizationCode = db.define('AuthorizationCode', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  code: {
    type: Sequelize.STRING,
    allowNull: false
  },
  redirectUri: {
    type: Sequelize.STRING,
    allowNull: false
  }
});

var Photo = db.define('Photo', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  description: {
    type: Sequelize.STRING
  },
  path: {
    type: Sequelize.STRING,
    allowNull: true
  }
}, {
  classMethods: {
    loadPhoto: function(req, id, fn) {
      Photo.find(parseInt(id, 10)).success(function(photo) {
        fn(null, photo);
      });
    }
  }
});

var User = db.define('User', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: Sequelize.STRING
  },
  singlyId: {
    type: Sequelize.STRING
  },
  singlyAccessToken: {
    type: Sequelize.STRING
  }
}, {
  classMethods: {
    loadUser: function(req, id, fn) {
      User.find(parseInt(id, 10)).success(function(user) {
        fn(null, user);
      });
    }
  }
});

User.hasMany(Photo);
Photo.belongsTo(User);

User.hasMany(AuthorizationCode);
User.hasMany(AccessToken);

Client.hasMany(AuthorizationCode);
Client.hasMany(AccessToken);

exports.init = function(callback) {
  async.forEachSeries([
    User,
    Photo,
    AuthorizationCode,
    AccessToken,
    Client
  ], function(model, cbForEachSeries) {
    model.sync().success(function() {
      cbForEachSeries();
    }).error(function (err) {
      cbForEachSeries(err);
    });
  }, function(err) {
    callback(err);
  });
};

module.exports.db = db;

module.exports.User = User;
module.exports.Photo = Photo;

module.exports.Client = Client;
module.exports.AccessToken = AccessToken;
module.exports.AuthorizationCode = AuthorizationCode;
