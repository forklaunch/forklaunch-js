import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectsCommandInput,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client
} from '@aws-sdk/client-s3';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { ObjectStore } from '@forklaunch/core/objectstore';
import { Readable } from 'stream';

/**
 * Options for configuring the S3ObjectStore.
 *
 * @example
 * const options: S3ObjectStoreOptions = {
 *   bucket: 'my-bucket',
 *   clientConfig: { region: 'us-west-2' }
 * };
 */
interface S3ObjectStoreOptions {
  /** The S3 bucket name. */
  bucket: string;
  /** Optional existing S3 client instance. */
  client?: S3Client;
  /** Optional configuration for creating a new S3 client. */
  clientConfig?: ConstructorParameters<typeof S3Client>[0];
}

/**
 * S3-backed implementation of the ObjectStore interface.
 * Provides methods for storing, retrieving, streaming, and deleting objects in S3.
 *
 * @example
 * const store = new S3ObjectStore(otelCollector, { bucket: 'my-bucket' }, telemetryOptions);
 * await store.putObject({ key: 'user-1', name: 'Alice' });
 * const user = await store.readObject<{ name: string }>('user-1');
 */
export class S3ObjectStore implements ObjectStore<S3Client> {
  private s3: S3Client;
  private bucket: string;

  /**
   * Creates a new S3ObjectStore instance.
   * @param openTelemetryCollector - Collector for OpenTelemetry metrics.
   * @param options - S3 configuration options.
   * @param telemetryOptions - Telemetry configuration options.
   *
   * @example
   * const store = new S3ObjectStore(otelCollector, { bucket: 'my-bucket' }, telemetryOptions);
   */
  constructor(
    private openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    options: S3ObjectStoreOptions,
    private telemetryOptions: TelemetryOptions
  ) {
    this.s3 = options.client || new S3Client(options.clientConfig || {});
    this.bucket = options.bucket;
  }

  /**
   * Stores an object in the S3 bucket.
   * @template T - The type of the object being stored.
   * @param object - The object to store. Must include a `key` property.
   *
   * @example
   * await store.putObject({ key: 'user-1', name: 'Alice' });
   */
  async putObject<T>(object: T & { key: string }): Promise<void> {
    const { key, ...rest } = object;
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(rest),
      ContentType: 'application/json'
    };
    await this.s3.send(new PutObjectCommand(params));
  }

  /**
   * Stores multiple objects in the S3 bucket.
   * @template T - The type of the objects being stored.
   * @param objects - The objects to store. Each must include a `key` property.
   *
   * @example
   * await store.putBatchObjects([
   *   { key: 'user-1', name: 'Alice' },
   *   { key: 'user-2', name: 'Bob' }
   * ]);
   */
  async putBatchObjects<T>(objects: (T & { key: string })[]): Promise<void> {
    await Promise.all(objects.map((obj) => this.putObject(obj)));
  }

  /**
   * Streams an object upload to the S3 bucket.
   * For compatibility; uses putObject internally.
   * @template T - The type of the object being stored.
   * @param object - The object to stream-upload. Must include a `key` property.
   */
  async streamUploadObject<T>(object: T & { key: string }): Promise<void> {
    await this.putObject(object);
  }

  /**
   * Streams multiple object uploads to the S3 bucket.
   * For compatibility; uses putBatchObjects internally.
   * @template T - The type of the objects being stored.
   * @param objects - The objects to stream-upload. Each must include a `key` property.
   */
  async streamUploadBatchObjects<T>(
    objects: (T & { key: string })[]
  ): Promise<void> {
    await this.putBatchObjects(objects);
  }

  /**
   * Deletes an object from the S3 bucket.
   * @param objectKey - The key of the object to delete.
   *
   * @example
   * await store.deleteObject('user-1');
   */
  async deleteObject(objectKey: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey })
    );
  }

  /**
   * Deletes multiple objects from the S3 bucket.
   * @param objectKeys - The keys of the objects to delete.
   *
   * @example
   * await store.deleteBatchObjects(['user-1', 'user-2']);
   */
  async deleteBatchObjects(objectKeys: string[]): Promise<void> {
    const params: DeleteObjectsCommandInput = {
      Bucket: this.bucket,
      Delete: {
        Objects: objectKeys.map((Key) => ({ Key }))
      }
    };
    await this.s3.send(new DeleteObjectsCommand(params));
  }

  /**
   * Reads an object from the S3 bucket.
   * @template T - The expected type of the object.
   * @param objectKey - The key of the object to read.
   * @returns The parsed object.
   *
   * @example
   * const user = await store.readObject<{ name: string }>('user-1');
   */
  async readObject<T>(objectKey: string): Promise<T> {
    const resp = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey })
    );
    const body = resp.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString()) as T;
  }

  /**
   * Reads multiple objects from the S3 bucket.
   * @template T - The expected type of the objects.
   * @param objectKeys - The keys of the objects to read.
   * @returns An array of parsed objects.
   *
   * @example
   * const users = await store.readBatchObjects<{ name: string }>(['user-1', 'user-2']);
   */
  async readBatchObjects<T>(objectKeys: string[]): Promise<T[]> {
    return Promise.all(objectKeys.map((key) => this.readObject<T>(key)));
  }

  /**
   * Streams an object download from the S3 bucket.
   * @param objectKey - The key of the object to download.
   * @returns A readable stream of the object's contents.
   * @throws If the S3 response does not include a readable stream.
   *
   * @example
   * const stream = await store.streamDownloadObject('user-1');
   * stream.pipe(fs.createWriteStream('user-1.json'));
   */
  async streamDownloadObject(objectKey: string): Promise<Readable> {
    const resp = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey })
    );
    if (!resp.Body || !(resp.Body instanceof Readable)) {
      throw new Error('S3 did not return a stream');
    }
    return resp.Body;
  }

  /**
   * Streams multiple object downloads from the S3 bucket.
   * @param objectKeys - The keys of the objects to download.
   * @returns An array of readable streams.
   *
   * @example
   * const streams = await store.streamDownloadBatchObjects(['user-1', 'user-2']);
   * streams[0].pipe(fs.createWriteStream('user-1.json'));
   */
  async streamDownloadBatchObjects(objectKeys: string[]): Promise<Readable[]> {
    return Promise.all(objectKeys.map((key) => this.streamDownloadObject(key)));
  }

  /**
   * Gets the underlying S3 client instance.
   * @returns The S3Client instance used by this store.
   *
   * @example
   * const s3Client = store.getClient();
   */
  getClient(): S3Client {
    return this.s3;
  }
}
