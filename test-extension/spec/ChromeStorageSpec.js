/*globals chrome, sampleDoctors*/
describe('ChromeStorage', function() {
  var chromeStorage
    , doctors
  ;

  beforeEach(function() {
    var loaded = false;

    doctors = sampleDoctors.map(function(doctor) {
      return new Backbone.Model(JSON.parse(JSON.stringify(doctor)));
    });

    /* Instantiate and wait for records to be loaded before testing. */
    runs(function() {
      chromeStorage = new Backbone.ChromeStorage('Doctors', 'local');

      chromeStorage.loaded.done(function() {
        loaded = true;
      });
    });

    waitsFor(function() {
      return loaded;
    }, 'chromeStorage should have been loaded', 750);
  });

  afterEach(function() {
    var cleared = false;

    chromeStorage = null;
    doctors = null;

    runs(function() {
      chrome.storage.local.clear(function() {
        cleared = true;
      });
    });

    waitsFor(function() {
      return cleared;
    }, 'The storage area should be cleared', 750);
  });

  describe('creating records', function() {
    it('should be able to persist a record and add an id', function() {
      var id = null;

      expect(chromeStorage.records.length).toBe(0);

      runs(function() {
        chromeStorage.create(doctors[0]).done(function(model) {
          id = model.id;
        });
      });

      waitsFor(function() {
        return id !== null;
      }, 'The model should have been saved', 750);

      runs(function() {
        expect(chromeStorage.records.length).toBe(1);
        expect(id).not.toBeNull();
      });
    });
  });
});
