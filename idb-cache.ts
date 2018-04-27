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
const isIOS = /iP(hone|(o|a)d);/.test(navigator.userAgent); 

export default class IDBCache {
  private _indexedDB : IDBFactory;
  private _dbName : string;
  private _maxSize : number = 52428800; // 50MB
  private _maxCount : number = 100; // 100files
  private _defaultAge : number = 86400; // 1day
  private _nowSize : number = 0;
  private _metaCache = new Map();

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

    this._initialize();
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
          reject();
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
              this._nowSize -= cacheMeta.size;
              this._metaCache.delete(key);
            }
            this._nowSize += meta.size;
            this._metaCache.set(key, meta);
    
            if(this._maxCount < this._metaCache.size || this._maxSize < this._nowSize){
              this._cleanup();
            }
            resolve();
          };
    
          transaction.onerror = () => {
            transaction.oncomplete = null;
            transaction.onerror = null;
            transaction.onabort = null;
            reject();
          };
    
          transaction.onabort = () => {
            transaction.oncomplete = null;
            transaction.onerror = null;
            transaction.onabort = null;
            reject();
          }
    
          try{
            dataStore.put(data, key);
            metaStore.put(meta, key);
          }catch(e){
            console.error(e);
            transaction.abort();
          }
        }, () => {
          // Open error
          reject();
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
            reject();
          }
        };

        request.onerror = () => {
          request.onsuccess = null;
          request.onerror = null;
          reject();
        };
      },
      () => {
        // Open error
        reject();
      });
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
          if(this._metaCache.has(key)){
            this._metaCache.delete(key);
          }
          resolve();
        };
  
        transaction.onerror = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          reject();
        };
  
        transaction.onabort = () => {
          transaction.oncomplete = null;
          transaction.onerror = null;
          transaction.onabort = null;
          reject();
        }
  
        try{
          dataStore.delete(key);
          metaStore.delete(key);
        }catch(e){
          console.error(e);
          transaction.abort();
        }
      },
      () => {
        // Open error
        reject();
      });
    });
  }

  private _initialize(){
    this._open((db) => {
      const transaction = db.transaction(STORE_NAME.META, 'readonly');
      const metaStore = transaction.objectStore(STORE_NAME.META);
      this._metaCache.clear();
      this._nowSize = 0;

      transaction.oncomplete = () => {
        transaction.oncomplete = null;
        transaction.onerror = null;
        // Sort in ascending order of expire
        this._metaCache = new Map([...this._metaCache.entries()].sort(function(a:any, b:any) {
          if (a[1].expire < b[1].expire) return -1;
          if (a[1].expire > b[1].expire) return 1;
          return 0;
        }));
        this._cleanup();
      }

      transaction.onerror = () => {
        transaction.oncomplete = null;
        transaction.onerror = null;
      }

      metaStore.openCursor().onsuccess = (event:any) => {
        const cursor = event.target.result;
        if (cursor) {
          this._metaCache.set(cursor.key, cursor.value);
          this._nowSize += cursor.value.size;
          cursor.continue();
        };
      };

    }, () => {
      // Ignore open error
    });
  }

  private _cleanup(){
    this._open((db) => {
      const removeKeys = new Set();
      const nowSeconds = Math.floor(Date.now() / 1000);
      let tmpNowSize = this._nowSize;
      let tmpNowCount = this._metaCache.size;
      this._metaCache.forEach((meta, key) => {
        if(meta.expire < nowSeconds || this._maxSize < tmpNowSize || this._maxCount < tmpNowCount){
          removeKeys.add(key);
          tmpNowSize -= meta.size;
          tmpNowCount--;
        }
      });
      if(0 < removeKeys.size){
        const transaction = db.transaction([STORE_NAME.META, STORE_NAME.DATA], 'readwrite');
        const metaStore = transaction.objectStore(STORE_NAME.META);
        const dataStore = transaction.objectStore(STORE_NAME.DATA);
        transaction.oncomplete = () => {
          transaction.oncomplete = null;
          removeKeys.forEach((key) => {
            if(this._metaCache.has(key)) this._metaCache.delete(key);
          });
        };
        // Do not catch abort and error

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

  private _open(success:(db:IDBDatabase) => void, error:Function){
    if(!this._indexedDB){
      error();
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
      success(request.result);
    }
    request.onerror = () => {
      console.error('IndexedDB open failed');
      request.onupgradeneeded = null;
      request.onblocked = null;
      request.onsuccess = null;
      request.onerror = null;
      error();
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