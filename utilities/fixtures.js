var util = require('util');

var models = require('models');

models.init(function() {
  console.log('models.init callback()');

  /*
  models.User.create({
      username: 'beau'
    })
    .success(function(user) {
      console.log(util.inspect(user));
    })
    .error(function(err) {
      console.error(err);
    });
  */

  models.Client.create({
    name: 'Test Application',
    clientId: 'e07e8e6e51bc6d169070b5cb468ca200',
    clientSecret: 'abb6449b4c7eaed14bd63571978852bc'
  }).success(function(client) {
    console.log(util.inspect(client));
  });
});
