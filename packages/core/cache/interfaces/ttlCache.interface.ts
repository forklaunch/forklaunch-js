import { TtlCacheRecord } from "../types/ttlCacheRecord";

/**
 * Interface representing a TTL (Time-To-Live) cache.
 */
export interface TtlCache {
    /**
     * Puts a record into the cache.
     *
     * @param {TtlCacheRecord} cacheRecord - The cache record to put into the cache.
     * @returns {Promise<void>} - A promise that resolves when the record is put into the cache.
     */
    putRecord(cacheRecord: TtlCacheRecord): Promise<void>;

    /**
     * Deletes a record from the cache.
     *
     * @param {string} cacheRecordKey - The key of the cache record to delete.
     * @returns {Promise<void>} - A promise that resolves when the record is deleted from the cache.
     */
    deleteRecord(cacheRecordKey: string): Promise<void>;

    /**
     * Reads a record from the cache.
     *
     * @param {string} cacheRecordKey - The key of the cache record to read.
     * @returns {Promise<TtlCacheRecord>} - A promise that resolves with the cache record.
     */
    readRecord(cacheRecordKey: string): Promise<TtlCacheRecord>;

    /**
     * Peeks at a record in the cache to check if it exists.
     *
     * @param {string} cacheRecordKey - The key of the cache record to peek at.
     * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the record exists.
     */
    peekRecord(cacheRecordKey: string): Promise<boolean>;

    /**
     * Gets the TTL (Time-To-Live) in milliseconds.
     *
     * @returns {number} - The TTL in milliseconds.
     */
    getTtlMilliseconds(): number;

    /**
     * Lists the keys in the cache that match a pattern prefix.
     *
     * @param {string} pattern_prefix - The pattern prefix to match.
     * @returns {Promise<string[]>} - A promise that resolves with an array of keys matching the pattern prefix.
     */
    listKeys(pattern_prefix: string): Promise<string[]>;
}
