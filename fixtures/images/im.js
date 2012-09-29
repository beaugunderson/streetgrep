var im = require('imagemagick');
var util = require('util');

im.readMetadata('IMG_2439.JPG', function(err, metadata) {
  if (err) {
    throw err;
  }

  console.log(util.inspect(metadata));
});
