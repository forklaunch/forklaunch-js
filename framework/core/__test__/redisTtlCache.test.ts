import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { RedisTtlCache } from '../src/cache/redisTtlCache';
import { OpenTelemetryCollector } from '../src/http/telemetry/openTelemetryCollector';

describe('redisTtlCache', () => {
  let container: StartedTestContainer;
  let cache: RedisTtlCache;
  let key: string;
  let value: unknown;
  let ttlMilliseconds: number;

  beforeAll(async () => {
    container = await new GenericContainer('redis')
      .withExposedPorts(6379)
      .start();

    cache = new RedisTtlCache(5000, new OpenTelemetryCollector('test'), {
      url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`
    });

    key = 'testKey';
    value = { data: 'testValue' };
    ttlMilliseconds = 1000;
  }, 30000);

  afterAll(async () => {
    await cache.disconnect();
    await container.stop();
  });

  it('put', async () => {
    await cache.putRecord({ key, value, ttlMilliseconds });
  });

  test('read', async () => {
    const storedValue = await cache.readRecord(key);

    expect(storedValue).toEqual({
      key,
      ttlMilliseconds,
      value
    });
  });

  test('peek', async () => {
    const exists = await cache.peekRecord(key);

    expect(exists).toBeTruthy();
  });

  test('delete', async () => {
    await cache.deleteRecord(key);
    const existsAfterDelete = await cache.peekRecord(key);

    expect(existsAfterDelete).toBeFalsy();
  });

  test('check no record after ttl', async () => {
    await Promise.resolve(setTimeout(async () => {}, ttlMilliseconds));
    const existsAfterTtl = await cache.peekRecord(key);
    expect(existsAfterTtl).toBeFalsy();
  });
});
