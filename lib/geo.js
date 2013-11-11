function defraction(coordinate) {
  var parts = coordinate.split('/');

  if (parts.length === 1) {
    return parseFloat(parts[0], 10);
  }

  return parseFloat(parts[0], 10) / parseFloat(parts[1], 10);
}

exports.exifCoordinatesToFloat = function (coordinates, reference) {
  if (!Array.isArray(coordinates)) {
    coordinates = coordinates.replace(',', ' ');
    coordinates = coordinates.split(' ');
  }

  var degrees = coordinates.length > 0 ? defraction(coordinates[0]) : 0;
  var minutes = coordinates.length > 1 ? defraction(coordinates[1]) : 0;
  var seconds = coordinates.length > 2 ? defraction(coordinates[2]) : 0;

  var flip = (reference === 'W' || reference === 'S') ? -1 : 1;

  return flip * (degrees + (minutes / 60) + (seconds / 3600));
};

exports.convertFromExif = function (exif) {
  var converted = {
    latitude: null,
    longitude: null
  };

  if (exif['GPS Latitude'] &&
    exif['GPS Latitude Ref'] &&
    exif['GPS Longitude'] &&
    exif['GPS Longitude Ref']) {
    converted.latitude = exports.exifCoordinatesToFloat(exif['GPS Latitude'],
      exif['GPS Latitude Ref']);
    converted.longitude = exports.exifCoordinatesToFloat(exif['GPS Longitude'],
      exif['GPS Longitude Ref']);
  }

  return converted;
};
