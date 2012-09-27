var models = require('../models');

/*
 * GET     /users             ->  index
 * GET     /users/new         ->  new
 * POST    /users             ->  create
 * GET     /users/:user       ->  show
 * GET     /users/:user/edit  ->  edit
 * PUT     /users/:user       ->  update
 * DELETE  /users/:user       ->  destroy
 */

exports.index = function(req, res) {
  models.User.count().success(function(count) {
    models.User.findAll({ offset: 0, limit: 25 }).success(function(users) {
      if (req.format === 'json') {
        return res.json(users);
      }

      res.render('users/index', {
        users: users,
        count: count
      });
    });
  });
};

exports.show = function(req, res) {
  models.User.find(parseInt(req.params.user, 10)).success(function(user) {
    if (req.format === 'json') {
      return res.json({
        user: user,
        photos: user.getPhotoes()
      });
    }

    res.render('users/show', {
      user: user,
      photos: user.getPhotoes()
    });
  });
};
