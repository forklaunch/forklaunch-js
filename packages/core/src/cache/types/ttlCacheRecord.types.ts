/**
 * Type representing a TTL (Time-To-Live) cache record.
 *
 * @typedef {Object} TtlCacheRecord
 * @property {string} key - The key of the cache record.
 * @property {any} value - The value of the cache record.
 * @property {number} ttlMilliseconds - The time-to-live of the cache record in milliseconds.
 */
export type TtlCacheRecord = {
  key: string;
  value: unknown;
  ttlMilliseconds: number;
};
