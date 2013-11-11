require('chai').should();

var geo = require('../lib/geo');

var tests = [
  {
    latitude: '46/1 5403/100 0/1',
    latitudeReference: 'N',
    latitudeFloat: 46.9005,
    longitude: '7/1 880/100 0/1',
    longitudeReference: 'E',
    longitudeFloat: 7.1466666666666665
  },
  {
    latitude: '57/1 38/1 5683/100',
    latitudeReference: 'N',
    latitudeFloat: 57.649119444444445,
    longitude: '10/1 24/1 2679/100',
    longitudeReference: 'W',
    longitudeFloat: -10.407441666666667
  }
];

describe('geo', function () {
  describe('#exifCoordinatesToFloat', function () {
    it('should provide accurate data', function () {
      tests.forEach(function (test) {
        var lat = geo.exifCoordinatesToFloat(test.latitude,
          test.latitudeReference);
        var lon = geo.exifCoordinatesToFloat(test.longitude,
          test.longitudeReference);

        lat.should.be.a('number');
        lon.should.be.a('number');

        lat.should.be.closeTo(test.latitudeFloat, 0.0001);
        lon.should.be.closeTo(test.longitudeFloat, 0.0001);
      });
    });
  });
});
