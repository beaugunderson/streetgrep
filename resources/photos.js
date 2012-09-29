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
  models.Photo.count().success(function(count) {
    models.Photo.findAll({ offset: 0, limit: 25 }).success(function(photos) {
      if (req.format === 'json') {
        return res.json(photos);
      }

      res.render('photos/index', {
        photos: photos,
        count: count
      });
    });
  });
};

exports.show = function(req, res) {
  models.Photo.find(parseInt(req.params.photo, 10)).success(function(photo) {
    if (req.format === 'json') {
      return res.json({
        photo: photo,
        user: photo.getUser()
      });
    }

    res.render('photos/show', {
      photo: photo,
      user: photo.getUser()
    });
  });
};
