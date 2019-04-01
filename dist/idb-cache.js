var IDBCache = (function () {
  'use strict';

  // idb-cache - https://github.com/drecom/idb-cache

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

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
  }; // iPhone/iPod/iPad

  var isIOS = /iP(hone|(o|a)d);/.test(window.navigator.userAgent);

  var IDBCache =
  /*#__PURE__*/
  function () {
    function IDBCache(dbName, strageLimit) {
      _classCallCheck(this, IDBCache);

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

      this._initialization = this._initialize();
    }
    /**
     * Save key-value in IndexedDB.
     * Overwrite if the key already exists.
     * @param key
     * @param value
     * @param maxAge Number of seconds to keep
     */


    _createClass(IDBCache, [{
      key: "set",
      value: function set(key, value) {
        var _this = this;

        var maxAge = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this._defaultAge;
        return new Promise(function (resolve, reject) {
          _this._serializeData(value, function (data, meta) {
            if (meta.size === 0) {
              reject(IDBCache.ERROR.INVALID_ARGUMENT);
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
                reject(IDBCache.ERROR.REQUEST_FAILED);
              };

              transaction.onabort = function () {
                transaction.oncomplete = null;
                transaction.onerror = null;
                transaction.onabort = null;
                reject(IDBCache.ERROR.REQUEST_FAILED);
              };

              try {
                dataStore.put(data, key);
                metaStore.put(meta, key);
              } catch (e) {
                console.error(e);
                transaction.abort();
              }
            }, function (errorCode) {
              // Open error
              reject(errorCode);
            });
          });
        });
      }
      /**
       * Get value from IndexedDB
       * @param key
       */

    }, {
      key: "get",
      value: function get(key) {
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
                // Can not find or expired
                reject(IDBCache.ERROR.GET_EMPTY);
              }
            };

            request.onerror = function () {
              request.onsuccess = null;
              request.onerror = null;
              reject(IDBCache.ERROR.REQUEST_FAILED);
            };
          }, function (errorCode) {
            // Open error
            reject(errorCode);
          });
        });
      }
      /**
       *  Check if the key exists
       *  @param key
       */

    }, {
      key: "has",
      value: function has(key) {
        var _this3 = this;

        if (!this._initialization) {
          return Promise.reject(IDBCache.ERROR.NOT_SUPPORT_IDB);
        }

        return this._initialization.then(function () {
          var cacheMeta = _this3._metaCache.get(key);

          var nowSeconds = Math.floor(Date.now() / 1000);
          return Boolean(cacheMeta && nowSeconds < cacheMeta.expire);
        });
      }
      /**
       * Delete one value of IndexedDB
       * @param key
       */

    }, {
      key: "delete",
      value: function _delete(key) {
        var _this4 = this;

        return new Promise(function (resolve, reject) {
          _this4._open(function (db) {
            var transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
            var metaStore = transaction.objectStore(STORE_NAME.META);
            var dataStore = transaction.objectStore(STORE_NAME.DATA);

            transaction.oncomplete = function () {
              transaction.oncomplete = null;
              transaction.onerror = null;
              transaction.onabort = null;

              var cacheMeta = _this4._metaCache.get(key);

              if (cacheMeta) {
                _this4._metaCache.delete(key);

                _this4._nowSize -= cacheMeta.size;
              }

              resolve();
            };

            transaction.onerror = function () {
              transaction.oncomplete = null;
              transaction.onerror = null;
              transaction.onabort = null;
              reject(IDBCache.ERROR.REQUEST_FAILED);
            };

            transaction.onabort = function () {
              transaction.oncomplete = null;
              transaction.onerror = null;
              transaction.onabort = null;
              reject(IDBCache.ERROR.REQUEST_FAILED);
            };

            try {
              dataStore.delete(key);
              metaStore.delete(key);
            } catch (e) {
              console.error(e);
              transaction.abort();
            }
          }, function (errorCode) {
            // Open error
            reject(errorCode);
          });
        });
      }
    }, {
      key: "_initialize",
      value: function _initialize() {
        var _this5 = this;

        return new Promise(function (resolve) {
          _this5._open(function (db) {
            var transaction = db.transaction(STORE_NAME.META, 'readonly');
            var metaStore = transaction.objectStore(STORE_NAME.META);

            _this5._metaCache.clear();

            _this5._nowSize = 0;
            var canGetAll = false;

            if (metaStore.getAllKeys && metaStore.getAll) {
              canGetAll = true;
            } else {
              console.warn('This device does not support getAll');
            }

            var allKeys;
            var allValues;

            transaction.oncomplete = function () {
              transaction.oncomplete = null;
              transaction.onerror = null;

              if (canGetAll) {
                for (var i = 0; i < allKeys.length; i++) {
                  var key = allKeys[i];
                  var val = allValues[i];

                  _this5._metaCache.set(key, val);

                  _this5._nowSize += val.size;
                }
              } // Sort in ascending order of expire


              var sortArray = [];

              var itelator = _this5._metaCache.entries();

              var iteratorResult = itelator.next();

              while (!iteratorResult.done) {
                sortArray.push(iteratorResult.value);
                iteratorResult = itelator.next();
              }

              sortArray.sort(function (a, b) {
                if (a[1].expire < b[1].expire) return -1;
                if (a[1].expire > b[1].expire) return 1;
                return 0;
              });
              _this5._metaCache = new Map(sortArray);

              _this5._cleanup();

              resolve();
            };

            transaction.onerror = function () {
              transaction.oncomplete = null;
              transaction.onerror = null;
              resolve();
            }; // referencing argument's event.target of openCursor() causes memory leak on Safari


            if (canGetAll) {
              metaStore.getAllKeys().onsuccess = function (event) {
                allKeys = event.target.result;
              };

              metaStore.getAll().onsuccess = function (event) {
                allValues = event.target.result;
              };
            } else {
              metaStore.openCursor().onsuccess = function (event) {
                var cursor = event.target.result;

                if (cursor) {
                  _this5._metaCache.set(cursor.key, cursor.value);

                  _this5._nowSize += cursor.value.size;
                  cursor.continue();
                }
              };
            }
          }, function () {// Ignore open error
          });
        });
      }
    }, {
      key: "_cleanup",
      value: function _cleanup() {
        var _this6 = this;

        this._open(function (db) {
          var removeKeys = new Set();
          var nowSeconds = Math.floor(Date.now() / 1000);
          var tmpNowCount = _this6._metaCache.size;

          _this6._metaCache.forEach(function (meta, key) {
            if (meta.expire < nowSeconds || _this6._maxSize < _this6._nowSize || _this6._maxCount < tmpNowCount) {
              removeKeys.add(key);
              _this6._nowSize -= meta.size;
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
                if (_this6._metaCache.has(key)) _this6._metaCache.delete(key);
              });
            };

            transaction.onerror = function () {
              console.error('IndexedDB cleanup failed');
              transaction.oncomplete = null;
              transaction.onerror = null;
              transaction.onabort = null;
              _this6._nowSize = 0;

              _this6._metaCache.forEach(function (meta) {
                _this6._nowSize += meta.size;
              });
            };

            transaction.onabort = function () {
              console.error('IndexedDB cleanup failed');
              transaction.oncomplete = null;
              transaction.onerror = null;
              transaction.onabort = null;
              _this6._nowSize = 0;

              _this6._metaCache.forEach(function (meta) {
                _this6._nowSize += meta.size;
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
        }, function () {// Ignore open error
        });
      }
    }, {
      key: "_createObjectStore",
      value: function _createObjectStore(db, oldVersion) {
        if (oldVersion < 1) {
          // Structure of first edition
          db.createObjectStore(STORE_NAME.META);
          db.createObjectStore(STORE_NAME.DATA);
        }
      }
    }, {
      key: "_open",
      value: function _open(success, error) {
        var _this7 = this;

        if (!this._indexedDB) {
          error(IDBCache.ERROR.NOT_SUPPORT_IDB);
          return;
        }

        var request = this._indexedDB.open(this._dbName, VERSION);

        request.onupgradeneeded = function (event) {
          request.onupgradeneeded = null;

          _this7._createObjectStore(request.result, event.oldVersion);
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

          try {
            success(request.result);
          } catch (e) {
            console.error(e);
            error(IDBCache.ERROR.UNKNOWN);
          }
        };

        request.onerror = function () {
          console.error('IndexedDB open failed');
          request.onupgradeneeded = null;
          request.onblocked = null;
          request.onsuccess = null;
          request.onerror = null;
          error(IDBCache.ERROR.CANNOT_OPEN);
        };
      }
    }, {
      key: "_serializeData",
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
        } // IndexedDB on iOS does not support blob


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
      key: "_deserializeData",
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
          var blob = new Blob([data], {
            type: meta.mime
          });
          cb(blob);
        } else {
          cb(data);
        }
      }
    }]);

    return IDBCache;
  }();
  IDBCache.ERROR = {
    INVALID_ARGUMENT: 1,
    CANNOT_OPEN: 2,
    REQUEST_FAILED: 3,
    GET_EMPTY: 4,
    NOT_SUPPORT_IDB: 5,
    UNKNOWN: 6
  };

  return IDBCache;

}());
//# sourceMappingURL=idb-cache.js.map
