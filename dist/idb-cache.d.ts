export default class IDBCache {
    private _indexedDB;
    private _dbName;
    private _maxSize;
    private _maxCount;
    private _defaultAge;
    private _nowSize;
    private _metaCache;
    constructor(dbName: string, strageLimit?: {
        size?: number;
        count?: number;
        defaultAge?: number;
    });
    set(key: string, value: string | ArrayBuffer | Blob, maxAge?: number): Promise<{}>;
    get(key: string): Promise<{}>;
    delete(key: string): Promise<{}>;
    private _initialize();
    private _cleanup();
    private _createObjectStore(db, oldVersion);
    private _open(success, error?);
    private _serializeData(data, cb);
    private _deserializeData(data, meta, cb);
}
