var express = require('express');

var models = require('models');

var app = express();

/*
 * GET     /users             ->  index
 * GET     /users/new         ->  new
 * POST    /users             ->  create
 * GET     /users/:user       ->  show
 * GET     /users/:user/edit  ->  edit
 * PUT     /users/:user       ->  update
 * DELETE  /users/:user       ->  destroy
 */

app.get('/', function (req, res) {
  var offset = 0;
  var limit = 25;

  if (req.param('offset')) {
    offset = req.param('offset');
  }

  if (req.param('limit')) {
    limit = req.param('limit');
  }

  models.User.count().success(function (count) {
    models.User.findAll({ offset: 0, limit: 25 }).success(function (users) {
      var data = {
        users: users,
        count: count
      };

      res.format({
        html: function () {
          res.render('users/index', data);
        },
        json: function () {
          // TODO: Sanitize for singlyAccessToken
          res.json(data);
        }
      });
    });
  });
});

app.get('/:user', function (req, res) {
  models.User.find(parseInt(req.params.user, 10)).success(function (user) {
    if (!user) {
      return res.send(404);
    }

    user.getPhotoes().success(function (photos) {
      var data = {
        user: user,
        photos: photos
      };

      res.format({
        html: function () {
          res.render('users/show', data);
        },
        json: function () {
          delete data.user.singlyAccessToken;

          res.json(data);
        }
      });
    });
  });
});

module.exports = app;
