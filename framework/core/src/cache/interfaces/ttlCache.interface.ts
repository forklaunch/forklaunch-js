import { TtlCacheRecord } from '../types/ttlCacheRecord.types';

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
  putRecord<T>(cacheRecord: TtlCacheRecord<T>): Promise<void>;

  /**
   * Puts a batch of records into the cache.
   *
   * @param {TtlCacheRecord<T>[]} cacheRecords - The cache records to put into the cache.
   * @returns {Promise<void>} - A promise that resolves when the records are put into the cache.
   */
  putBatchRecords<T>(cacheRecords: TtlCacheRecord<T>[]): Promise<void>;

  /**
   * Enqueues a record into the cache.
   *
   * @param {string} cacheRecordKey - The key of the cache record to enqueue.
   * @returns {Promise<void>} - A promise that resolves when the record is enqueued into the cache.
   */
  enqueueRecord<T>(queueName: string, cacheRecord: T): Promise<void>;

  /**
   *
   * Enqueues a batch of records into the cache.
   *
   * @param {string[]} cacheRecordKeys - The keys of the cache records to enqueue.
   * @returns {Promise<void>} - A promise that resolves when the records are enqueued into the cache.
   */
  enqueueBatchRecords<T>(queueName: string, cacheRecords: T[]): Promise<void>;

  /**
   * Deletes a record from the cache.
   *
   * @param {string} cacheRecordKey - The key of the cache record to delete.
   * @returns {Promise<void>} - A promise that resolves when the record is deleted from the cache.
   */
  deleteRecord(cacheRecordKey: string): Promise<void>;

  /**
   * Deletes a batch of records from the cache.
   *
   * @param {string[]} cacheRecordKeys - The keys of the cache records to delete.
   * @returns {Promise<void>} - A promise that resolves when the records are deleted from the cache.
   */
  deleteBatchRecords(cacheRecordKeys: string[]): Promise<void>;

  /**
   * Dequeues a record from the cache.
   *
   * @param {string} cacheRecordKey - The key of the cache record to dequeue.
   * @returns {Promise<void>} - A promise that resolves when the record is dequeued from the cache.
   */
  dequeueRecord<T>(queueName: string): Promise<T>;

  /**
   * Dequeues a batch of records from the cache.
   *
   * @param {string[]} cacheRecordKeys - The keys of the cache records to dequeue.
   * @returns {Promise<void>} - A promise that resolves when the records are dequeued from the cache.
   */
  dequeueBatchRecords<T>(queueName: string, pageSize: number): Promise<T[]>;

  /**
   * Reads a record from the cache.
   *
   * @param {string} cacheRecordKey - The key of the cache record to read.
   * @returns {Promise<TtlCacheRecord>} - A promise that resolves with the cache record.
   */
  readRecord<T>(cacheRecordKey: string): Promise<TtlCacheRecord<T>>;

  /**
   * Reads a batch of records from the cache.
   *
   * @param {string[] | string} cacheRecordKeysOrPrefix - The keys of the cache records to read or a prefix to match.
   * @returns {Promise<TtlCacheRecord<T>[]>} - A promise that resolves with the cache records.
   */
  readBatchRecords<T>(
    cacheRecordKeysOrPrefix: string[] | string
  ): Promise<TtlCacheRecord<T>[]>;

  /**
   * Peeks at a record in the cache to check if it exists.
   *
   * @param {string} cacheRecordKey - The key of the cache record to peek at.
   * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the record exists.
   */
  peekRecord(cacheRecordKey: string): Promise<boolean>;

  /**
   * Peeks at a batch of records in the cache to check if they exist.
   *
   * @param {string[] | string} cacheRecordKeysOrPrefix - The keys of the cache records to peek at or a prefix to match.
   * @returns {Promise<boolean[]>} - A promise that resolves with an array of booleans indicating if the records exist.
   */
  peekBatchRecords(
    cacheRecordKeysOrPrefix: string[] | string
  ): Promise<boolean[]>;

  /**
   * Peeks at a record in the cache to check if it exists.
   *
   * @param {string} queueName - The name of the queue to peek at.
   * @returns {Promise<T>} - A promise that resolves with the record.
   */
  peekQueueRecord<T>(queueName: string): Promise<T>;

  /**
   * Peeks at a batch of records in the cache to check if they exist.
   *
   * @param {string} queueName - The name of the queue to peek at.
   * @returns {Promise<T[]>} - A promise that resolves with the records.
   */
  peekQueueRecords<T>(queueName: string, pageSize: number): Promise<T[]>;

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
