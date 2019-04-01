/**
 * @author Drecom Co.,Ltd. http://www.drecom.co.jp/
 */

const VERSION = 1;

const STORE_NAME = {
  META : 'metastore',
  DATA : 'datastore',
}

const DATA_TYPE = {
  STRING : 1,
  ARRAYBUFFER : 2,
  BLOB : 3,
}

// iPhone/iPod/iPad
const isIOS = /iP(hone|(o|a)d);/.test(window.navigator.userAgent);

export default class IDBCache {
  public static ERROR = {
    INVALID_ARGUMENT : 1,
    CANNOT_OPEN : 2,
    REQUEST_FAILED : 3,
    GET_EMPTY : 4,
    NOT_SUPPORT_IDB : 5,
    UNKNOWN : 6,
  }
  private _indexedDB : IDBFactory;
  private _dbName : string;
  private _maxSize : number = 52428800; // 50MB
  private _maxCount : number = 100; // 100files
  private _defaultAge : number = 86400; // 1day
  private _nowSize : number = 0;
  private _metaCache = new Map();
  private _initialization : Promise<void> | void;

  constructor(dbName:string, strageLimit?:{size?:number, count?:number, defaultAge?:number}) {
    this._indexedDB = (window as any).indexedDB || (window as any).webkitIndexedDB || (window as any).mozIndexedDB || (window as any).OIndexedDB || (window as any).msIndexedDB;

    this._dbName = dbName;

    if(!this._indexedDB){
      console.error('IndexedDB is not supported');
      return;
    }

    if(strageLimit){
      if(strageLimit.size) this._maxSize = strageLimit.size;
      if(strageLimit.count) this._maxCount = strageLimit.count;
      if(strageLimit.defaultAge) this._defaultAge = strageLimit.defaultAge;
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
  public set(key:string, value:string | ArrayBuffer | Blob, maxAge:number = this._defaultAge){
    return new Promise((resolve:Function, reject:Function) => {
      this._serializeData(value, (data, meta) => {
        if(meta.size === 0){
          reject(IDBCache.ERROR.INVALID_ARGUMENT);
          return;
        }
        this._open((db) => {
          const transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
          const metaStore = transaction.objectStore(STORE_NAME.META);
          const dataStore = transaction.objectStore(STORE_NAME.DATA);
          const nowSeconds = Math.floor(Date.now() / 1000);
          meta.expire = nowSeconds + maxAge;

          transaction.oncomplete = () => {
            transaction.oncomplete = null;
            transaction.onerror = null;
            transaction.onabort = null;
            const cacheMeta = this._metaCache.get(key);
            if(cacheMeta){
              this._metaCache.delete(key);
              this._nowSize -= cacheMeta.size;
            }
            this._metaCache.set(key, meta);
            this._nowSize += meta.size;

            if(this._maxCount < this._metaCache.size || this._maxSize < this._nowSize){
              this._cleanup();
            }
            resolve();
          };

          transaction.onerror = () => {
            transaction.oncomplete = null;
            transaction.onerror = null;
            transaction.onabort = null;
            reject(IDBCache.ERROR.REQUEST_FAILED);
          };

          transaction.onabort = () => {
            transaction.oncomplete = null;
            transaction.onerror = null;
            transaction.onabort = null;
            reject(IDBCache.ERROR.REQUEST_FAILED);
          }

          try{
            dataStore.put(data, key);
            metaStore.put(meta, key);
          }catch(e){
            console.error(e);
            transaction.abort();
          }
        }, (errorCode) => {
          // Open error
          reject(errorCode);
        });
      })
    });
  }

  /**
   * Get value from IndexedDB
   * @param key
   */
  public get(key:string){
    return new Promise((resolve:Function, reject:Function) => {
      this._open((db) => {
        const transaction = db.transaction(STORE_NAME.DATA, 'readonly');
        const dataStore = transaction.objectStore(STORE_NAME.DATA);
        const request = dataStore.get(key);
        request.onsuccess = () => {
          request.onsuccess = null;
          request.onerror = null;
          const nowSeconds = Math.floor(Date.now() / 1000);
          const cacheMeta = this._metaCache.get(key);
          if(request.result && cacheMeta && nowSeconds < cacheMeta.expire){
            this._deserializeData(request.result, cacheMeta, (data) => {
              resolve(data);
            });
          }else{
            // Can not find or expired
            reject(IDBCache.ERROR.GET_EMPTY);
          }
        };

        request.onerror = () => {
          request.onsuccess = null;
          request.onerror = null;
          reject(IDBCache.ERROR.REQUEST_FAILED);
        };
      },
      (errorCode) => {
        // Open error
        reject(errorCode);
      });
    });
  }
  
  /**
   *  Check if the key exists
   *  @param key
   */
  public has(key:string) {
    if (!this._initialization) {
      return Promise.reject(IDBCache.ERROR.NOT_SUPPORT_IDB);
    }
    return this._initialization.then(() => {
      const cacheMeta = this._metaCache.get(key);
      const nowSeconds = Math.floor(Date.now() / 1000);
      return Boolean(cacheMeta && nowSeconds < cacheMeta.expire);
    });
  }

  /**
   * Delete one value of IndexedDB
   * @param key
   */
  public delete(key:string) {
    return new Promise((resolve:Function, reject:Function) => {
      this._open((db) => {
        const transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
        const metaStore = transaction.objectStore(STORE_NAME.META);
        const dataStore = transaction.objectStore(STORE_NAME.DATA);

        transaction.oncomplete = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          const cacheMeta = this._metaCache.get(key);
          if(cacheMeta){
            this._metaCache.delete(key);
            this._nowSize -= cacheMeta.size;
          }
          resolve();
        };

        transaction.onerror = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          reject(IDBCache.ERROR.REQUEST_FAILED);
        };

        transaction.onabort = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          reject(IDBCache.ERROR.REQUEST_FAILED);
        }

        try{
          dataStore.delete(key);
          metaStore.delete(key);
        }catch(e){
          console.error(e);
          transaction.abort();
        }
      },
      (errorCode) => {
        // Open error
        reject(errorCode);
      });
    });
  }

  private _initialize(){
    return new Promise<void>((resolve: Function) => {
      this._open((db) => {
        const transaction = db.transaction(STORE_NAME.META, 'readonly');
        const metaStore = transaction.objectStore(STORE_NAME.META);
        this._metaCache.clear();
        this._nowSize = 0;

        let canGetAll = false;
        if((metaStore as any).getAllKeys && (metaStore as any).getAll){
          canGetAll = true;
        }else{
          console.warn('This device does not support getAll');
        }
        let allKeys : Array<string>;
        let allValues : Array<any>;

        transaction.oncomplete = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;

          if(canGetAll){
            for (var i = 0; i < allKeys.length; i++) {
              const key = allKeys[i];
              const val = allValues[i];
              this._metaCache.set(key, val);
              this._nowSize += val.size;
            }
          }

          // Sort in ascending order of expire
          const sortArray = [];
          const itelator = this._metaCache.entries();
          let iteratorResult = itelator.next();
          while(!iteratorResult.done){
            sortArray.push(iteratorResult.value);
            iteratorResult = itelator.next();
          }
          sortArray.sort(function(a:any, b:any) {
            if (a[1].expire < b[1].expire) return -1;
            if (a[1].expire > b[1].expire) return 1;
            return 0;
          });
          this._metaCache = new Map(sortArray);

          this._cleanup();
          
          resolve();
        }

        transaction.onerror = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;
          
          resolve();
        }

        // referencing argument's event.target of openCursor() causes memory leak on Safari
        if(canGetAll){
          (metaStore as any).getAllKeys().onsuccess = (event: any) => {
            allKeys = event.target.result;
          };
          (metaStore as any).getAll().onsuccess = (event: any) => {
            allValues = event.target.result;
          };
        }else{
          metaStore.openCursor().onsuccess = (event:any) => {
            const cursor = event.target.result;
            if (cursor) {
              this._metaCache.set(cursor.key, cursor.value);
              this._nowSize += cursor.value.size;
              cursor.continue();
            };
          };
        };
      }, () => {
        // Ignore open error
      });
    });
  }

  private _cleanup(){
    this._open((db) => {
      const removeKeys = new Set();
      const nowSeconds = Math.floor(Date.now() / 1000);
      let tmpNowCount = this._metaCache.size;
      this._metaCache.forEach((meta, key) => {
        if(meta.expire < nowSeconds || this._maxSize < this._nowSize || this._maxCount < tmpNowCount){
          removeKeys.add(key);
          this._nowSize -= meta.size;
          tmpNowCount--;
        }
      });
      if(0 < removeKeys.size){
        const transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
        const metaStore = transaction.objectStore(STORE_NAME.META);
        const dataStore = transaction.objectStore(STORE_NAME.DATA);
        transaction.oncomplete = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          removeKeys.forEach((key) => {
            if(this._metaCache.has(key)) this._metaCache.delete(key);
          });
        };
        transaction.onerror = () => {
          console.error('IndexedDB cleanup failed');
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          this._nowSize = 0;
          this._metaCache.forEach((meta) => {
            this._nowSize += meta.size;
          })
        };
        transaction.onabort = () => {
          console.error('IndexedDB cleanup failed');
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          this._nowSize = 0;
          this._metaCache.forEach((meta) => {
            this._nowSize += meta.size;
          })
        };

        removeKeys.forEach((key) => {
          try{
            dataStore.delete(key);
            metaStore.delete(key);
          }catch(e){
            transaction.abort();
          }
        });
      }
    }, () => {
      // Ignore open error
    });
  }

  private _createObjectStore(db:IDBDatabase ,oldVersion:number){
    if(oldVersion < 1){
      // Structure of first edition
      db.createObjectStore(STORE_NAME.META);
      db.createObjectStore(STORE_NAME.DATA);
    }
  }

  private _open(success:(db:IDBDatabase) => void, error:(errorCode:number) => void){
    if(!this._indexedDB){
      error(IDBCache.ERROR.NOT_SUPPORT_IDB);
      return;
    }

    let request = this._indexedDB.open(this._dbName, VERSION);
    request.onupgradeneeded = (event) => {
      request.onupgradeneeded = null;
      this._createObjectStore(request.result as IDBDatabase, event.oldVersion);
    }
    request.onblocked = () => {
      request.onblocked = null;
      alert('Please close other tabs');
    }
    request.onsuccess = () => {
      request.onupgradeneeded = null;
      request.onblocked = null;
      request.onsuccess = null;
      request.onerror = null;
      try{
        success(request.result);
      }catch(e){
        console.error(e);
        error(IDBCache.ERROR.UNKNOWN);
      }
    }
    request.onerror = () => {
      console.error('IndexedDB open failed');
      request.onupgradeneeded = null;
      request.onblocked = null;
      request.onsuccess = null;
      request.onerror = null;
      error(IDBCache.ERROR.CANNOT_OPEN);
    }
  }

  private _serializeData(data:string | ArrayBuffer | Blob, cb:(data:any, meta:any) => void){
    const meta = {
      type:0,
      size:0,
    }
    if(typeof data === 'string'){
      meta.type = DATA_TYPE.STRING;
      meta.size = (data as string).length;
    }else if(data instanceof ArrayBuffer){
      meta.type = DATA_TYPE.ARRAYBUFFER;
      meta.size = (data as ArrayBuffer).byteLength;
    }else if(data instanceof Blob){
      meta.type = DATA_TYPE.BLOB;
      meta.size = (data as Blob).size;
    }else{
      console.warn('Is not supported type of value');
    }

    // IndexedDB on iOS does not support blob
    if(isIOS && meta.type === DATA_TYPE.BLOB){
      const reader = new FileReader();
      reader.onload = () => {
        reader.onload = null;
        meta.size = (reader.result as ArrayBuffer).byteLength;
        (meta as any).mime = (data as Blob).type;
        cb(reader.result, meta);
      }
      reader.onerror = () => {
        reader.onerror = null;
        meta.size = 0;
        cb(null, meta);
      }
      reader.readAsArrayBuffer(data as Blob);
    }else{
      cb(data, meta);
    }
  }

  private _deserializeData(data:string | ArrayBuffer | Blob, meta:any, cb:(data:any) => void){
    let type = 0;
    if(typeof data === 'string'){
      type = DATA_TYPE.STRING;
    }else if(data instanceof ArrayBuffer){
      type = DATA_TYPE.ARRAYBUFFER;
    }else if(data instanceof Blob){
      type = DATA_TYPE.BLOB;
    }

    if(meta && meta.type === DATA_TYPE.BLOB && type === DATA_TYPE.ARRAYBUFFER){
      const blob = new Blob([data], {type:meta.mime});
      cb(blob);
    }else{
      cb(data);
    }
  }
}
