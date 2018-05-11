export default class IDBCache {
    static ERROR: {
        INVALID_ARGUMENT: number;
        CANNOT_OPEN: number;
        REQUEST_FAILED: number;
        GET_EMPTY: number;
    };
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
    /**
     * Save key-value in IndexedDB.
     * Overwrite if the key already exists.
     * @param key
     * @param value
     * @param maxAge Number of seconds to keep
     */
    set(key: string, value: string | ArrayBuffer | Blob, maxAge?: number): Promise<{}>;
    /**
     * Get value from IndexedDB
     * @param key
     */
    get(key: string): Promise<{}>;
    /**
     * Delete one value of IndexedDB
     * @param key
     */
    delete(key: string): Promise<{}>;
    private _initialize();
    private _cleanup();
    private _createObjectStore(db, oldVersion);
    private _open(success, error);
    private _serializeData(data, cb);
    private _deserializeData(data, meta, cb);
}
