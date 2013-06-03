// For testing Backbone integration
function createCollectionWithModel() {
  var Doctor = Backbone.Model.extend()
    , Doctors = Backbone.Collection.extend({
      model: Doctor,
      chromeStorage: new Backbone.ChromeStorage('Doctors', 'local')
    });

  return new Doctors();
}

// Sample data
var sampleDoctors = [
  {
    number: 1,
    actor: 'William Hartnell'
  },
  {
    number: 2,
    actor: 'Patrick Troughton'
  },
  {
    number: 3,
    actor: 'Jon Pertwee'
  },
  {
    number: 4,
    actor: 'Tom Baker'
  },
  {
    number: 5,
    actor: 'Peter Davison'
  },
  {
    number: 6,
    actor: 'Colin Baker'
  },
  {
    number: 7,
    actor: 'Sylvester McCoy'
  },
  {
    number: 8,
    actor: 'Paul McGann'
  },
  {
    number: 9,
    actor: 'Christopher Eccleston'
  },
  {
    number: 10,
    actor: 'David Tennant'
  },
  {
    number: 11,
    actor: 'Matt Smith'
  }
];
