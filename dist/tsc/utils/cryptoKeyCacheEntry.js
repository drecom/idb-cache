export default class CryptoKeyCacheEntry {
    get length() {
        return this._length;
    }
    get key() {
        return this._key;
    }
    get id() {
        return this._id;
    }
    constructor(id, key, length) {
        this._id = id;
        this._key = key;
        this._length = length;
    }
}
