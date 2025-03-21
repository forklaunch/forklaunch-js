import { RedisClientOptions, createClient } from 'redis';
import { TtlCache } from './interfaces/ttlCache.interface';
import { TtlCacheRecord } from './types/ttlCacheRecord.types';
import { OpenTelemetryCollector } from '../http/telemetry/openTelemetryCollector';
import { MetricsDefinition } from '../http';

/**
 * Class representing a Redis-based TTL (Time-To-Live) cache.
 * Implements the TtlCache interface.
 */
export class RedisTtlCache implements TtlCache {
  private client;

  /**
   * Creates an instance of RedisTtlCache.
   *
   * @param {number} ttlMilliseconds - The default TTL in milliseconds.
   * @param {RedisClientOptions} [hostingOptions] - The Redis client options.
   */
  constructor(
    private ttlMilliseconds: number,
    private openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    hostingOptions?: RedisClientOptions
  ) {
    // Connects to localhost:6379 by default
    // url usage: redis[s]://[[username][:password]@][host][:port][/db-number]
    this.client = createClient(hostingOptions);
    this.client.on('error', (err) => openTelemetryCollector.error(err));
    this.client.connect().catch(openTelemetryCollector.error);
  }

  /**
   * Puts a record into the Redis cache.
   *
   * @param {TtlCacheRecord} param0 - The cache record to put into the cache.
   * @returns {Promise<void>} - A promise that resolves when the record is put into the cache.
   */
  async putRecord<T>({
    key,
    value,
    ttlMilliseconds = this.ttlMilliseconds
  }: TtlCacheRecord<T>): Promise<void> {
    await this.client.set(key, JSON.stringify(value), {
      PX: ttlMilliseconds
    });
  }

  /**
   * Deletes a record from the Redis cache.
   *
   * @param {string} cacheRecordKey - The key of the cache record to delete.
   * @returns {Promise<void>} - A promise that resolves when the record is deleted from the cache.
   */
  async deleteRecord(cacheRecordKey: string): Promise<void> {
    await this.client.del(cacheRecordKey);
  }

  /**
   * Reads a record from the Redis cache.
   *
   * @param {string} cacheRecordKey - The key of the cache record to read.
   * @returns {Promise<TtlCacheRecord>} - A promise that resolves with the cache record.
   * @throws {Error} - Throws an error if the record is not found.
   */
  async readRecord<T>(cacheRecordKey: string): Promise<TtlCacheRecord<T>> {
    const value = await this.client.get(cacheRecordKey);
    if (value === null) {
      throw new Error(`Record not found for key: ${cacheRecordKey}`);
    }
    const ttl = await this.client.ttl(cacheRecordKey); // Fetch TTL from Redis
    return {
      key: cacheRecordKey,
      value: JSON.parse(value),
      ttlMilliseconds: ttl * 1000
    };
  }

  /**
   * Lists the keys in the Redis cache that match a pattern prefix.
   *
   * @param {string} pattern_prefix - The pattern prefix to match.
   * @returns {Promise<string[]>} - A promise that resolves with an array of keys matching the pattern prefix.
   */
  async listKeys(pattern_prefix: string): Promise<string[]> {
    const keys = await this.client.keys(pattern_prefix + '*');
    return keys;
  }

  /**
   * Peeks at a record in the Redis cache to check if it exists.
   *
   * @param {string} cacheRecordKey - The key of the cache record to peek at.
   * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating if the record exists.
   */
  async peekRecord(cacheRecordKey: string): Promise<boolean> {
    const result = await this.client.exists(cacheRecordKey);
    return result === 1;
  }

  /**
   * Disconnects the Redis client.
   *
   * @returns {Promise<void>} - A promise that resolves when the client is disconnected.
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Gets the default TTL (Time-To-Live) in milliseconds.
   *
   * @returns {number} - The TTL in milliseconds.
   */
  getTtlMilliseconds(): number {
    return this.ttlMilliseconds;
  }
}
