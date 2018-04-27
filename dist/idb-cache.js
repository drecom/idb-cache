(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.IDBCache = factory());
}(this, (function () { 'use strict';

  /* @author Drecom Co.,Ltd. http://www.drecom.co.jp/ */

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  /**
   * @author Drecom Co.,Ltd. http://www.drecom.co.jp/
   */
  var VERSION = 1;
  var STORE_NAME = {
      META: 'metastore',
      DATA: 'datastore'
  };
  var DATA_TYPE = {
      STRING: 1,
      ARRAYBUFFER: 2,
      BLOB: 3
  };
  // iPhone/iPod/iPad
  var isIOS = /iP(hone|(o|a)d);/.test(window.navigator.userAgent);

  var IDBCache = function () {
      function IDBCache(dbName, strageLimit) {
          classCallCheck(this, IDBCache);

          this._maxSize = 52428800; // 50MB
          this._maxCount = 100; // 100files
          this._defaultAge = 86400; // 1day
          this._nowSize = 0;
          this._metaCache = new Map();
          this._indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;
          this._dbName = dbName;
          if (!this._indexedDB) {
              console.error('IndexedDB is not supported');
              return;
          }
          if (strageLimit) {
              if (strageLimit.size) this._maxSize = strageLimit.size;
              if (strageLimit.count) this._maxCount = strageLimit.count;
              if (strageLimit.defaultAge) this._defaultAge = strageLimit.defaultAge;
          }
          this._initialize();
      }
      /**
       * Save key-value in IndexedDB.
       * Overwrite if the key already exists.
       * @param key
       * @param value
       * @param maxAge Number of seconds to keep
       */


      createClass(IDBCache, [{
          key: 'set',
          value: function set$$1(key, value) {
              var _this = this;

              var maxAge = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this._defaultAge;

              return new Promise(function (resolve, reject) {
                  _this._serializeData(value, function (data, meta) {
                      if (meta.size === 0) {
                          reject();
                          return;
                      }
                      _this._open(function (db) {
                          var transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
                          var metaStore = transaction.objectStore(STORE_NAME.META);
                          var dataStore = transaction.objectStore(STORE_NAME.DATA);
                          var nowSeconds = Math.floor(Date.now() / 1000);
                          meta.expire = nowSeconds + maxAge;
                          transaction.oncomplete = function () {
                              transaction.oncomplete = null;
                              transaction.onerror = null;
                              transaction.onabort = null;
                              var cacheMeta = _this._metaCache.get(key);
                              if (cacheMeta) {
                                  _this._metaCache.delete(key);
                                  _this._nowSize -= cacheMeta.size;
                              }
                              _this._metaCache.set(key, meta);
                              _this._nowSize += meta.size;
                              if (_this._maxCount < _this._metaCache.size || _this._maxSize < _this._nowSize) {
                                  _this._cleanup();
                              }
                              resolve();
                          };
                          transaction.onerror = function () {
                              transaction.oncomplete = null;
                              transaction.onerror = null;
                              transaction.onabort = null;
                              reject();
                          };
                          transaction.onabort = function () {
                              transaction.oncomplete = null;
                              transaction.onerror = null;
                              transaction.onabort = null;
                              reject();
                          };
                          try {
                              dataStore.put(data, key);
                              metaStore.put(meta, key);
                          } catch (e) {
                              console.error(e);
                              transaction.abort();
                          }
                      }, function () {
                          // Open error
                          reject();
                      });
                  });
              });
          }
          /**
           * Get value from IndexedDB
           * @param key
           */

      }, {
          key: 'get',
          value: function get$$1(key) {
              var _this2 = this;

              return new Promise(function (resolve, reject) {
                  _this2._open(function (db) {
                      var transaction = db.transaction(STORE_NAME.DATA, 'readonly');
                      var dataStore = transaction.objectStore(STORE_NAME.DATA);
                      var request = dataStore.get(key);
                      request.onsuccess = function () {
                          request.onsuccess = null;
                          request.onerror = null;
                          var nowSeconds = Math.floor(Date.now() / 1000);
                          var cacheMeta = _this2._metaCache.get(key);
                          if (request.result && cacheMeta && nowSeconds < cacheMeta.expire) {
                              _this2._deserializeData(request.result, cacheMeta, function (data) {
                                  resolve(data);
                              });
                          } else {
                              reject();
                          }
                      };
                      request.onerror = function () {
                          request.onsuccess = null;
                          request.onerror = null;
                          reject();
                      };
                  }, function () {
                      // Open error
                      reject();
                  });
              });
          }
          /**
           * Delete one value of IndexedDB
           * @param key
           */

      }, {
          key: 'delete',
          value: function _delete(key) {
              var _this3 = this;

              return new Promise(function (resolve, reject) {
                  _this3._open(function (db) {
                      var transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
                      var metaStore = transaction.objectStore(STORE_NAME.META);
                      var dataStore = transaction.objectStore(STORE_NAME.DATA);
                      transaction.oncomplete = function () {
                          transaction.oncomplete = null;
                          transaction.onerror = null;
                          transaction.onabort = null;
                          var cacheMeta = _this3._metaCache.get(key);
                          if (cacheMeta) {
                              _this3._metaCache.delete(key);
                              _this3._nowSize -= cacheMeta.size;
                          }
                          resolve();
                      };
                      transaction.onerror = function () {
                          transaction.oncomplete = null;
                          transaction.onerror = null;
                          transaction.onabort = null;
                          reject();
                      };
                      transaction.onabort = function () {
                          transaction.oncomplete = null;
                          transaction.onerror = null;
                          transaction.onabort = null;
                          reject();
                      };
                      try {
                          dataStore.delete(key);
                          metaStore.delete(key);
                      } catch (e) {
                          console.error(e);
                          transaction.abort();
                      }
                  }, function () {
                      // Open error
                      reject();
                  });
              });
          }
      }, {
          key: '_initialize',
          value: function _initialize() {
              var _this4 = this;

              this._open(function (db) {
                  var transaction = db.transaction(STORE_NAME.META, 'readonly');
                  var metaStore = transaction.objectStore(STORE_NAME.META);
                  _this4._metaCache.clear();
                  _this4._nowSize = 0;
                  transaction.oncomplete = function () {
                      transaction.oncomplete = null;
                      transaction.onerror = null;
                      // Sort in ascending order of expire
                      _this4._metaCache = new Map([].concat(toConsumableArray(_this4._metaCache.entries())).sort(function (a, b) {
                          if (a[1].expire < b[1].expire) return -1;
                          if (a[1].expire > b[1].expire) return 1;
                          return 0;
                      }));
                      _this4._cleanup();
                  };
                  transaction.onerror = function () {
                      transaction.oncomplete = null;
                      transaction.onerror = null;
                  };
                  metaStore.openCursor().onsuccess = function (event) {
                      var cursor = event.target.result;
                      if (cursor) {
                          _this4._metaCache.set(cursor.key, cursor.value);
                          _this4._nowSize += cursor.value.size;
                          cursor.continue();
                      }
                  };
              }, function () {
                  // Ignore open error
              });
          }
      }, {
          key: '_cleanup',
          value: function _cleanup() {
              var _this5 = this;

              this._open(function (db) {
                  var removeKeys = new Set();
                  var nowSeconds = Math.floor(Date.now() / 1000);
                  var tmpNowCount = _this5._metaCache.size;
                  _this5._metaCache.forEach(function (meta, key) {
                      if (meta.expire < nowSeconds || _this5._maxSize < _this5._nowSize || _this5._maxCount < tmpNowCount) {
                          removeKeys.add(key);
                          _this5._nowSize -= meta.size;
                          tmpNowCount--;
                      }
                  });
                  if (0 < removeKeys.size) {
                      var transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
                      var metaStore = transaction.objectStore(STORE_NAME.META);
                      var dataStore = transaction.objectStore(STORE_NAME.DATA);
                      transaction.oncomplete = function () {
                          transaction.oncomplete = null;
                          transaction.onerror = null;
                          transaction.onabort = null;
                          removeKeys.forEach(function (key) {
                              if (_this5._metaCache.has(key)) _this5._metaCache.delete(key);
                          });
                      };
                      transaction.onerror = function () {
                          transaction.oncomplete = null;
                          transaction.onerror = null;
                          transaction.onabort = null;
                          _this5._nowSize = 0;
                          _this5._metaCache.forEach(function (meta) {
                              _this5._nowSize += meta.size;
                          });
                      };
                      transaction.onabort = function () {
                          transaction.oncomplete = null;
                          transaction.onerror = null;
                          transaction.onabort = null;
                          _this5._nowSize = 0;
                          _this5._metaCache.forEach(function (meta) {
                              _this5._nowSize += meta.size;
                          });
                      };
                      removeKeys.forEach(function (key) {
                          try {
                              dataStore.delete(key);
                              metaStore.delete(key);
                          } catch (e) {
                              transaction.abort();
                          }
                      });
                  }
              }, function () {
                  // Ignore open error
              });
          }
      }, {
          key: '_createObjectStore',
          value: function _createObjectStore(db, oldVersion) {
              if (oldVersion < 1) {
                  // Structure of first edition
                  db.createObjectStore(STORE_NAME.META);
                  db.createObjectStore(STORE_NAME.DATA);
              }
          }
      }, {
          key: '_open',
          value: function _open(success, error) {
              var _this6 = this;

              if (!this._indexedDB) {
                  error();
                  return;
              }
              var request = this._indexedDB.open(this._dbName, VERSION);
              request.onupgradeneeded = function (event) {
                  request.onupgradeneeded = null;
                  _this6._createObjectStore(request.result, event.oldVersion);
              };
              request.onblocked = function () {
                  request.onblocked = null;
                  alert('Please close other tabs');
              };
              request.onsuccess = function () {
                  request.onupgradeneeded = null;
                  request.onblocked = null;
                  request.onsuccess = null;
                  request.onerror = null;
                  success(request.result);
              };
              request.onerror = function () {
                  console.error('IndexedDB open failed');
                  request.onupgradeneeded = null;
                  request.onblocked = null;
                  request.onsuccess = null;
                  request.onerror = null;
                  error();
              };
          }
      }, {
          key: '_serializeData',
          value: function _serializeData(data, cb) {
              var meta = {
                  type: 0,
                  size: 0
              };
              if (typeof data === 'string') {
                  meta.type = DATA_TYPE.STRING;
                  meta.size = data.length;
              } else if (data instanceof ArrayBuffer) {
                  meta.type = DATA_TYPE.ARRAYBUFFER;
                  meta.size = data.byteLength;
              } else if (data instanceof Blob) {
                  meta.type = DATA_TYPE.BLOB;
                  meta.size = data.size;
              } else {
                  console.warn('Is not supported type of value');
              }
              // IndexedDB on iOS does not support blob
              if (isIOS && meta.type === DATA_TYPE.BLOB) {
                  var reader = new FileReader();
                  reader.onload = function () {
                      reader.onload = null;
                      meta.size = reader.result.byteLength;
                      meta.mime = data.type;
                      cb(reader.result, meta);
                  };
                  reader.onerror = function () {
                      reader.onerror = null;
                      meta.size = 0;
                      cb(null, meta);
                  };
                  reader.readAsArrayBuffer(data);
              } else {
                  cb(data, meta);
              }
          }
      }, {
          key: '_deserializeData',
          value: function _deserializeData(data, meta, cb) {
              var type = 0;
              if (typeof data === 'string') {
                  type = DATA_TYPE.STRING;
              } else if (data instanceof ArrayBuffer) {
                  type = DATA_TYPE.ARRAYBUFFER;
              } else if (data instanceof Blob) {
                  type = DATA_TYPE.BLOB;
              }
              if (meta && meta.type === DATA_TYPE.BLOB && type === DATA_TYPE.ARRAYBUFFER) {
                  var blob = new Blob([data], { type: meta.mime });
                  cb(blob);
              } else {
                  cb(data);
              }
          }
      }]);
      return IDBCache;
  }();

  return IDBCache;

})));
//# sourceMappingURL=idb-cache.js.map
