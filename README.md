# idb-cache

idb-cache is a fast and simple cache library for JavaScript using IndexedDB.

IndexedDB is persistent storage, but idb-cache automatically destroys old files. Therefore, users do not have to worry about storage pressure due to garbage files.

# Usage

## Initialization

```
const idbc = new IDBCache("examplesDB", {
  size : 52428800, // Size limit (Default 50MB)
  count : 100, // Number of files limit (Default 100)
  defaultAge : 86400, // max-age when there is no setting (Default 1day)
});
```

## Set cache

```
// Designate max-age
idbc.set('key1', "value1"); // defaultAge cache
idbc.set('key2', "value2", 604800); // 1week cache

// Supported type
idbc.set('key3', new ArrayBuffer(512)); // ArrayBuffer
idbc.set('key4', new Blob([new ArrayBuffer(1024)])); // Blob
```

## Get cache

```
idbc.get('key1').then(function(value){
  console.log(value);
}).catch(function(){
  // Does not exist, expired or error
});
```
