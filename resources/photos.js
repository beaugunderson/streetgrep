var express = require('express');
var fs = require('fs');
var gm = require('gm');
var login = require('connect-ensure-login');
var uuid = require('node-uuid');

var models = require('models');
var image = require('image');
var geo = require('geo');

var app = express();

/*
 * GET     /photos             ->  index
 * GET     /photos/new         ->  new
 * POST    /photos             ->  create
 * GET     /photos/:photo      ->  show
 * GET     /photos/:photo/edit ->  edit
 * PUT     /photos/:photo      ->  update
 * DELETE  /photos/:photo      ->  destroy
 */

app.get('/', function (req, res) {
  models.Photo.count().success(function (count) {
    models.Photo.findAll({ offset: 0, limit: 25 }).success(function (photos) {
      var data = {
        photos: photos,
        count: count
      };

      res.format({
        html: function () {
          res.render('photos/index', data);
        },
        json: function () {
          res.json(data);
        }
      });
    });
  });
});

app.get('/new', [
  login.ensureLoggedIn(),
  function (req, res) {
    res.render('upload');
  }
]);

app.post('/', function (req, res) {
  gm(req.files.photo.path).identify(function (err, metadata) {
    var location = geo.convertFromExif(metadata['Profile-EXIF']);

    fs.readFile(req.files.photo.path, function (err, data) {
      // XXX
      var fileName = uuid.v1() + '.jpg';
      var newPath = __dirname + '/../public/originals/' + fileName;

      fs.writeFile(newPath, data, function (err) {
        if (err) {
          return res.send(500, 'fs.writeFile error: ' + err);
        }

        image.resize('thumbnail', newPath, __dirname +
          '/../public/thumbnails/' + fileName);
        image.resize('full', newPath, __dirname +
          '/../public/resized/' + fileName);

        models.Photo.create({
          name: fileName,
          latitude: location.latitude,
          longitude: location.longitude,
          UserId: req.user.id
        }).success(function (photo) {
          res.redirect(String(photo.id));
        }).error(function (err) {
          res.send(500, 'models.Photo.create error: ' + err);
        });
      });
    });
  });
});

app.get('/:photo', function (req, res) {
  models.Photo.find(parseInt(req.params.photo, 10)).success(function (photo) {
    photo.getUser().success(function (user) {
      var data = {
        photo: photo,
        user: user
      };

      res.format({
        html: function () {
          res.render('photos/show', data);
        },
        json: function () {
          res.json(data);
        }
      });
    });
  });
});

module.exports = app;
