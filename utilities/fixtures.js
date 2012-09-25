var util = require('util');

var models = require('../models');

models.init(function() {
  console.log('models.init callback()');

  models.User.create({
      username: 'beau'
    })
    .success(function(user) {
      console.log(util.inspect(user));
    })
    .error(function(err) {
      console.error(err);
    });
});
