var models = require('../models');

exports.index = function(req, res) {
  models.User.findAll({ offset: 0, limit: 25 }).success(function(users) {
    if (req.format === 'json') {
      return res.json(users);
    }

    res.render('users/index', {
      users: users
    });
  });
};

exports.show = function(req, res) {
  models.User.find(parseInt(req.params.user, 10)).success(function(user) {
    if (req.format === 'json') {
      return res.json(user);
    }

    res.render('users/show', {
      user: user
    });
  });
};
