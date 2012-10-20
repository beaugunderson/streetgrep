var spawn = require('child_process').spawn;

var imageFormats = {
  thumbnail: '-thumbnail 250x250^> -gravity center -extent 177x177 ' +
    '-filter Lanczos png24:',
  full: '-resize 1024x768 jpg:'
};

exports.resize = function (type, source, destination) {
  var proc = spawn('convert', [source].concat((imageFormats[type] +
    destination).split(' ')));

  proc.stderr.on('data', function (err) {
    console.log('Conversion failed:', err.toString());
  });
};
