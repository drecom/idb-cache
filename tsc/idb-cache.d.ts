/**
 * @author Drecom Co.,Ltd. http://www.drecom.co.jp/
 */
export default class IDBCache {
    static ERROR: {
        INVALID_ARGUMENT: number;
        CANNOT_OPEN: number;
        REQUEST_FAILED: number;
        GET_EMPTY: number;
        NOT_SUPPORT_IDB: number;
        UNKNOWN: number;
    };
    private _indexedDB;
    private _dbName;
    private _maxSize;
    private _maxCount;
    private _defaultAge;
    private _nowSize;
    private _metaCache;
    private _initialization;
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
     *  Check if the key exists
     *  @param key
     */
    has(key: string): Promise<boolean>;
    /**
     * Delete one value of IndexedDB
     * @param key
     */
    delete(key: string): Promise<{}>;
    private _initialize;
    private _cleanup;
    private _createObjectStore;
    private _open;
    private _serializeData;
    private _deserializeData;
}
