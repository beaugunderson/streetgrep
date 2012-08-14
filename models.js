var Sequelize = require('sequelize');

var db = new Sequelize('database', 'username', 'password', {
  dialect: 'sqlite',
  storage: 'streetgrep.sqlite'
});

var Image = db.define('Image', {
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
  underscored: true
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
  }
}, {
  underscored: true
});

Image.belongsTo(User);
User.hasMany(Image);

Image.sync();
User.sync();

module.exports.db = db;

module.exports.User = User;
module.exports.Image = Image;
