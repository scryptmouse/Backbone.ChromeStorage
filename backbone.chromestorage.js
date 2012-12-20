(function(factory) {
  if (typeof define === 'function' && define.amd)
    define(['jquery', 'underscore', 'backbone'], factory);
  else
    factory(this.$, this._, this.Backbone);
}(function($, _, Backbone) {
  'use strict';

  // #ChromeStorage.Wrapper

  // A wrapper around the `chrome.storage.*` API that uses
  // `$.Deferred` objects for greater flexibility.
  function Wrapper(type) {
    type = ''+type || 'local';

    if (!chrome.storage[type]) {
      console.warn('Unknown type %s, defaulting to local', type);
      type = 'local';
    }

    this.type = type;
    this.storage = chrome.storage[this.type];
  }

  // ## _csResponse
  //
  // Private helper function that's used to return a callback to
  // wrapped `chrome.storage.*` methods.
  //
  // It will **resolve** the provided `$.Deferred` object
  // with the response, or **reject** it if there was an
  // error.
  function _csResponse(dfd) {
    return function() {
      var err = chrome.runtime.lastError;
      if (!err)
        dfd.resolve.apply(dfd, arguments);
      else {
        console.warn("chromeStorage error: '%s'", err.message);
        dfd.reject(dfd, err.message, err);
      }
    };
  }

  // ## chrome.storage.* API
  // Private factory functions for wrapping API methods

  // ### wrapMethod
  //
  // For wrapping **clear** and **getBytesInUse**
  function wrapMethod(method) {
    return function(cb) {
      var dfd = $.Deferred();

      if (typeof cb === 'function')
        dfd.done(cb);

      this.storage[method](_csResponse(dfd));

      return dfd.promise();
    };
  }

  // ### wrapAccessor
  //
  // For wrapping **get**, **set**, and **remove**.
  function wrapAccessor(method) {
    return function(items, cb) {
      var dfd = $.Deferred();

      if (typeof cb === 'function')
        dfd.done(cb);

      this.storage[method](items, _csResponse(dfd));

      return dfd.promise();
    };
  }

  // The `Wrapper` prototype has the same methods as the `chrome.storage.*` API,
  // accepting the same parameters, except that they return `$.Deferred` promise
  // and the callback is always optional. If one is provided, it will be added as a
  // **done** callback.
  _(Wrapper.prototype).extend({
    getBytesInUse: wrapMethod('getBytesInUse'),

    clear: wrapMethod('clear'),

    get: wrapAccessor('get'),

    set: wrapAccessor('set'),

    remove: wrapAccessor('remove'),

    // Pick out the relevant properties from the storage API.
    getQuotaObject: function() {
      return _(this.storage).pick(
        'QUOTA_BYTES',
        'QUOTA_BYTES_PER_ITEM',
        'MAX_ITEMS',
        'MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE',
        'MAX_WRITE_OPERATIONS_PER_HOUR');
    }
  });

  // #Backbone.ChromeStorage

  // Public API is essentially the same as Backbone.localStorage.
  function ChromeStorage(name, type) {
    _.bindAll(this);

    this.name = name;
    this.type = type || ChromeStorage.defaultType || 'local';
    this.store = new Wrapper(this.type);

    this.loaded = this.store.get(this.name).
      pipe(this._parseRecords).
      done((function(records) {
        this.records = records;
      }).bind(this));
  }

  // `Backbone.ChromeStorage.defaultType` can be overridden globally if desired.
  //
  // The current options are `'local'` or `'sync'`.
  ChromeStorage.defaultType = 'local';

  // ### wantsJSON

  // Private helper function for use with a `$.Deferred`'s **pipe**.
  //
  // It mimics the effect of returning a JSON representation of the
  // provided model from a server, in order to satisfy Backbone.sync
  // methods that expect that.
  function wantsJSON(model) {
    return function() {
      return model.toJSON();
    };
  }

  // ### _S4
  // Generate a random four-digit hex string for **_guid**.
  function _S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }

  // ### _guid
  // Pseudo-GUID generator
  function _guid() {
    return (_S4()+_S4()+"-"+_S4()+"-"+_S4()+"-"+_S4()+"-"+_S4()+_S4()+_S4());
  }

  _(ChromeStorage.prototype).extend({
    // ## CRUD methods
    //
    // ### create
    create: function(model) {
      if (!model.id) {
        model.id = _guid();
        model.set(model.idAttribute, model.id);
      }

      return this.store.set(this._wrap(model), this._created.bind(this, model)).pipe(wantsJSON(model));
    },

    _created: function(model) {
      this.records.push(''+model.id);
      this.save();
    },

    // ### update
    update: function(model) {
      return this.store.set(this._wrap(model), this._updated.bind(this, model)).pipe(wantsJSON(model));
    },

    _updated: function(model) {
      var id = ''+model.id;

      if (!_(this.records).include(id)) {
        this.records.push(id);
        this.save();
      }
    },

    // ### find
    find: function(model) {
      return this.store.get(this._wrap(model)).pipe(this._found);
    },

    _found: function(model) {
      return JSON.parse(model);
    },

    // ### findAll
    findAll: function() {
      var modelsDfd = $.Deferred()
        /* Bind the callback to use once the models are fetched. */
        , resolveModels = modelsDfd.resolve.bind(modelsDfd)
      ;

      // Waits until the model IDs have been initially
      // populated, and then queries the storage for
      // the actual records.
      $.when(this.loaded).done((function(records) {
        var model_ids = this._getRecordIds();

        this.store.get(model_ids, resolveModels);
      }).bind(this));

      return modelsDfd.pipe(this._foundAll);
    },

    _foundAll: function(models) {
      return _(models).map(JSON.parse);
    },

    // ### destroy
    destroy: function(model) {
      return this.store.
        remove(this._idOf(model), this._destroyed.bind(this, model)).
        pipe(wantsJSON(model));
    },

    _destroyed: function(model) {
      this.records = _.without(this.records, this._idOf(model));
      this.save();
    },

    // ## Utility methods
    //
    // ### quota
    // This is mostly relevant in `sync` contexts,
    // given the rate-limited write operations.
    //
    // For `local` contexts, it will just return an object with
    // the `QUOTA_BYTES` property.
    //
    // In `sync` contexts, it will return the above as well as:
    //
    //  * `QUOTA_BYTES_PER_ITEM`
    //  * `MAX_ITEMS`
    //  * `MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE`
    //  * `MAX_WRITE_OPERATIONS_PER_HOUR`
    //
    // It also queries the API with `getBytesInUse`, adding that
    // to the resultant object under the property name `QUOTA_BYTES_IN_USE`.
    quota: function() {
      var q = this.store.getQuotaObject();

      return this.store.getBytesInUse().pipe(function(bytes) {
        return _(q).extend({
          QUOTA_BYTES_IN_USE: bytes
        });
      });
    },

    // ### save
    // Save the current list of model ids into
    // a stringified array with the collection
    // name as key.
    save: function() {
      var o = {};

      o[this.name] = this.records.join(',');

      this.store.set(o);
    },

    // ### _getRecordIds
    // Get an array of all model IDs to fetch from storage,
    // prefixed with the collection name
    _getRecordIds: function() {
      return this.records.map(this._idOf);
    },

    // ### _idOf
    // Get the key that the item will be stored as:
    // the collection name followed by the model's id.
    //
    // Accepts a model instance or the id directly.
    _idOf: function(model) {
      return this.name+'-'+(_.isString(model) ? model : model.id);
    },

    // ### _wrap
    // Stringify a model instance into an object that
    // the storage API wants.
    _wrap: function(model) {
      var o = {};

      o[this._idOf(model)] = JSON.stringify(model);

      return o;
    },

    // ### _parseRecords
    // Takes the object returned from `chrome.storage` with the
    // collection name as a property name, and a stringified array
    // of model ids as the property's value. It **split**s the string and
    // returns the result.
    _parseRecords: function(records) {
      if (records && records[this.name] && _.isString(records[this.name]))
        return records[this.name].split(',');
      else
        return [];
    }
  });

  Backbone.ChromeStorage = ChromeStorage;
  Backbone.ChromeStorage.Wrapper = Wrapper;

  //## Backbone.chromeSync

  // Largely the same implementation as in Backbone.localSync, except that
  // `$.Deferred` objects are requisite.
  Backbone.ChromeStorage.sync = Backbone.chromeSync = function(method, model, options, error) {
    var store = model.chromeStorage || model.collection.chromeStorage
      , resp
      , isFn = _.isFunction
    ;

    switch(method) {
      case "read":
        resp = model.id != null ? store.find(model) : store.findAll();
        break;
      case "create":
        resp = store.create(model);
        break;
      case "update":
        resp = store.update(model);
        break;
      case "delete":
        resp = store.destroy(model);
        break;
      default:
        var err = new Error('Unknown Method: "'+method+'"');
        resp = $.Deferred();
        resp.reject(resp, err.message, err);
    }

    if (isFn(options.success))
      resp.done(options.success);

    if (isFn(options.error))
      resp.fail(options.error);

    if (isFn(error))
      resp.fail(options.error);

    return resp && resp.promise();
  };

  Backbone.ajaxSync = Backbone.sync;

  Backbone.getSyncMethod = function(model) {
    if (model.chromeStorage || (model.collection && model.collection.chromeStorage))
      return Backbone.ChromeStorage.sync;
    else
      return Backbone.ajaxSync;
  };

  Backbone.sync = function(method, model, options, error) {
    return Backbone.getSyncMethod(model).apply(this, [method, model, options, error]);
  };

  return ChromeStorage;
}));
