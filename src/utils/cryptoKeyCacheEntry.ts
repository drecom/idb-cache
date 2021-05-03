export default class CryptoKeyCacheEntry {
    get length(): number {
        return this._length;
    }

    get key(): CryptoKey {
        return this._key;
    }

    get id(): string {
        return this._id;
    }

    private readonly _id: string;
    private readonly _key: CryptoKey;
    private readonly _length: number;

    constructor(id: string, key: CryptoKey, length: number) {
        this._id = id;
        this._key = key;
        this._length = length;
    }
}