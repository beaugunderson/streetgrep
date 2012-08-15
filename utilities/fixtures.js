var util = require('util');

var models = require('../models');

models.User.create({
    username: 'beau'
  })
  .success(function(user) {
    console.log(util.inspect(user));
  })
  .error(function(err) {
    console.error(err);
  });
