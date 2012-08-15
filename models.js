var Sequelize = require('sequelize');

var db = new Sequelize('database', 'username', 'password', {
  dialect: 'sqlite',
  storage: 'streetgrep.sqlite'
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
    allowNull: false
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
    type: Sequelize.STRING,
    allowNull: false
  },
  singlyId: {
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

User.sync();
Photo.sync();

module.exports.db = db;

module.exports.User = User;
module.exports.Photo = Photo;
