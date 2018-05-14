(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.IDBCache = factory());
}(this, (function () { 'use strict';

    /* @author Drecom Co.,Ltd. http://www.drecom.co.jp/ */

    /**
     * @author Drecom Co.,Ltd. http://www.drecom.co.jp/
     */
    var __read = undefined && undefined.__read || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o),
            r,
            ar = [],
            e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) {
                ar.push(r.value);
            }
        } catch (error) {
            e = { error: error };
        } finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            } finally {
                if (e) throw e.error;
            }
        }
        return ar;
    };
    var __spread = undefined && undefined.__spread || function () {
        for (var ar = [], i = 0; i < arguments.length; i++) {
            ar = ar.concat(__read(arguments[i]));
        }return ar;
    };
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
    var IDBCache = /** @class */function () {
        function IDBCache(dbName, strageLimit) {
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
        IDBCache.prototype.set = function (key, value, maxAge) {
            var _this = this;
            if (maxAge === void 0) {
                maxAge = this._defaultAge;
            }
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
                    }, function () {
                        // Open error
                        reject(IDBCache.ERROR.CANNOT_OPEN);
                    });
                });
            });
        };
        /**
         * Get value from IndexedDB
         * @param key
         */
        IDBCache.prototype.get = function (key) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this._open(function (db) {
                    var transaction = db.transaction(STORE_NAME.DATA, 'readonly');
                    var dataStore = transaction.objectStore(STORE_NAME.DATA);
                    var request = dataStore.get(key);
                    request.onsuccess = function () {
                        request.onsuccess = null;
                        request.onerror = null;
                        var nowSeconds = Math.floor(Date.now() / 1000);
                        var cacheMeta = _this._metaCache.get(key);
                        if (request.result && cacheMeta && nowSeconds < cacheMeta.expire) {
                            _this._deserializeData(request.result, cacheMeta, function (data) {
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
                }, function () {
                    // Open error
                    reject(IDBCache.ERROR.CANNOT_OPEN);
                });
            });
        };
        /**
         * Delete one value of IndexedDB
         * @param key
         */
        IDBCache.prototype.delete = function (key) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this._open(function (db) {
                    var transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
                    var metaStore = transaction.objectStore(STORE_NAME.META);
                    var dataStore = transaction.objectStore(STORE_NAME.DATA);
                    transaction.oncomplete = function () {
                        transaction.oncomplete = null;
                        transaction.onerror = null;
                        transaction.onabort = null;
                        var cacheMeta = _this._metaCache.get(key);
                        if (cacheMeta) {
                            _this._metaCache.delete(key);
                            _this._nowSize -= cacheMeta.size;
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
                }, function () {
                    // Open error
                    reject(IDBCache.ERROR.CANNOT_OPEN);
                });
            });
        };
        IDBCache.prototype._initialize = function () {
            var _this = this;
            this._open(function (db) {
                var transaction = db.transaction(STORE_NAME.META, 'readonly');
                var metaStore = transaction.objectStore(STORE_NAME.META);
                _this._metaCache.clear();
                _this._nowSize = 0;
                transaction.oncomplete = function () {
                    transaction.oncomplete = null;
                    transaction.onerror = null;
                    // Sort in ascending order of expire
                    _this._metaCache = new Map(__spread(_this._metaCache.entries()).sort(function (a, b) {
                        if (a[1].expire < b[1].expire) return -1;
                        if (a[1].expire > b[1].expire) return 1;
                        return 0;
                    }));
                    _this._cleanup();
                };
                transaction.onerror = function () {
                    transaction.oncomplete = null;
                    transaction.onerror = null;
                };
                metaStore.openCursor().onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        _this._metaCache.set(cursor.key, cursor.value);
                        _this._nowSize += cursor.value.size;
                        cursor.continue();
                    }
                };
            }, function () {
                // Ignore open error
            });
        };
        IDBCache.prototype._cleanup = function () {
            var _this = this;
            this._open(function (db) {
                var removeKeys = new Set();
                var nowSeconds = Math.floor(Date.now() / 1000);
                var tmpNowCount = _this._metaCache.size;
                _this._metaCache.forEach(function (meta, key) {
                    if (meta.expire < nowSeconds || _this._maxSize < _this._nowSize || _this._maxCount < tmpNowCount) {
                        removeKeys.add(key);
                        _this._nowSize -= meta.size;
                        tmpNowCount--;
                    }
                });
                if (0 < removeKeys.size) {
                    var transaction_1 = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
                    var metaStore_1 = transaction_1.objectStore(STORE_NAME.META);
                    var dataStore_1 = transaction_1.objectStore(STORE_NAME.DATA);
                    transaction_1.oncomplete = function () {
                        transaction_1.oncomplete = null;
                        transaction_1.onerror = null;
                        transaction_1.onabort = null;
                        removeKeys.forEach(function (key) {
                            if (_this._metaCache.has(key)) _this._metaCache.delete(key);
                        });
                    };
                    transaction_1.onerror = function () {
                        console.error('IndexedDB cleanup failed');
                        transaction_1.oncomplete = null;
                        transaction_1.onerror = null;
                        transaction_1.onabort = null;
                        _this._nowSize = 0;
                        _this._metaCache.forEach(function (meta) {
                            _this._nowSize += meta.size;
                        });
                    };
                    transaction_1.onabort = function () {
                        console.error('IndexedDB cleanup failed');
                        transaction_1.oncomplete = null;
                        transaction_1.onerror = null;
                        transaction_1.onabort = null;
                        _this._nowSize = 0;
                        _this._metaCache.forEach(function (meta) {
                            _this._nowSize += meta.size;
                        });
                    };
                    removeKeys.forEach(function (key) {
                        try {
                            dataStore_1.delete(key);
                            metaStore_1.delete(key);
                        } catch (e) {
                            transaction_1.abort();
                        }
                    });
                }
            }, function () {
                // Ignore open error
            });
        };
        IDBCache.prototype._createObjectStore = function (db, oldVersion) {
            if (oldVersion < 1) {
                // Structure of first edition
                db.createObjectStore(STORE_NAME.META);
                db.createObjectStore(STORE_NAME.DATA);
            }
        };
        IDBCache.prototype._open = function (success, error) {
            var _this = this;
            if (!this._indexedDB) {
                error();
                return;
            }
            var request = this._indexedDB.open(this._dbName, VERSION);
            request.onupgradeneeded = function (event) {
                request.onupgradeneeded = null;
                _this._createObjectStore(request.result, event.oldVersion);
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
        };
        IDBCache.prototype._serializeData = function (data, cb) {
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
                var reader_1 = new FileReader();
                reader_1.onload = function () {
                    reader_1.onload = null;
                    meta.size = reader_1.result.byteLength;
                    meta.mime = data.type;
                    cb(reader_1.result, meta);
                };
                reader_1.onerror = function () {
                    reader_1.onerror = null;
                    meta.size = 0;
                    cb(null, meta);
                };
                reader_1.readAsArrayBuffer(data);
            } else {
                cb(data, meta);
            }
        };
        IDBCache.prototype._deserializeData = function (data, meta, cb) {
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
        };
        IDBCache.ERROR = {
            INVALID_ARGUMENT: 1,
            CANNOT_OPEN: 2,
            REQUEST_FAILED: 3,
            GET_EMPTY: 4
        };
        return IDBCache;
    }();

    return IDBCache;

})));
//# sourceMappingURL=idb-cache.js.map
