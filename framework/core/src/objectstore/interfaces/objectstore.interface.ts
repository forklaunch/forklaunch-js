import { Readable } from 'stream';

/**
 * Interface representing a objectstore.
 */
export interface ObjectStore<Client> {
  /**
   * Puts a record into the objectstore.
   *
   * @param {T} object - The object to put into the objectstore.
   * @returns {Promise<void>} - A promise that resolves when the record is put into the objectstore.
   */
  putObject<T>(object: T): Promise<void>;

  /**
   * Puts a batch of records into the objectstore.
   *
   * @param {T[]} objects - The objects to put into the objectstore.
   * @returns {Promise<void>} - A promise that resolves when the records are put into the objectstore.
   */
  putBatchObjects<T>(objects: T[]): Promise<void>;

  /**
   * Enqueues a record into the objectstore.
   *
   * @param {T} object - The object to enqueue into the objectstore.
   * @returns {Promise<void>} - A promise that resolves when the record is enqueued into the objectstore.
   */
  streamUploadObject<T>(object: T): Promise<void>;

  /**
   *
   * Enqueues a batch of records into the objectstore.
   *
   * @param {T[]} objects - The objects to enqueue into the objectstore.
   * @returns {Promise<void>} - A promise that resolves when the records are enqueued into the objectstore.
   */
  streamUploadBatchObjects<T>(objects: T[]): Promise<void>;

  /**
   * Deletes a record from the objectstore.
   *
   * @param {string} objectKey - The key of the object to delete.
   * @returns {Promise<void>} - A promise that resolves when the object is deleted from the objectstore.
   */
  deleteObject(objectKey: string): Promise<void>;

  /**
   * Deletes a batch of records from the objectstore.
   *
   * @param {string[]} objectKeys - The keys of the objects to delete.
   * @returns {Promise<void>} - A promise that resolves when the records are deleted from the objectstore.
   */
  deleteBatchObjects(objectKeys: string[]): Promise<void>;

  /**
   * Reads a record from the objectstore.
   *
   * @param {string} objectKey - The key of the object to read.
   * @returns {Promise<TtlCacheRecord>} - A promise that resolves with the objectstore record.
   */
  readObject<T>(objectKey: string): Promise<T>;

  /**
   * Reads a batch of records from the objectstore.
   *
   * @param {string[]} objectKeys - The keys of the objects to read.
   * @returns {Promise<TtlCacheRecord<T>[]>} - A promise that resolves with the objects.
   */
  readBatchObjects<T>(objectKeys: string[]): Promise<T[]>;

  /**
   * Peeks at a record in the objectstore to check if it exists.
   *
   * @param {string} objectstoreRecordKey - The key of the objectstore record to peek at.
   * @returns {Promise<Readable>} - A promise that resolves with a boolean indicating if the record exists.
   */
  streamDownloadObject(objectKey: string): Promise<Readable>;

  /**
   * Peeks at a batch of records in the objectstore to check if they exist.
   *
   * @param {string[]} objectKeys - The keys of the objectstore records to peek at or a prefix to match.
   * @returns {Promise<Readable[]>} - A promise that resolves with an array of booleans indicating if the records exist.
   */
  streamDownloadBatchObjects(objectKeys: string[]): Promise<Readable[]>;

  /**
   * Gets the underlying objectstore client instance.
   *
   * @returns {Client} The objectstore client instance
   */
  getClient(): Client;
}
