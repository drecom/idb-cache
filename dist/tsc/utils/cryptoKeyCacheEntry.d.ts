export default class CryptoKeyCacheEntry {
    readonly length: number;
    readonly key: CryptoKey;
    readonly id: string;
    private readonly _id;
    private readonly _key;
    private readonly _length;
    constructor(id: string, key: CryptoKey, length: number);
}
