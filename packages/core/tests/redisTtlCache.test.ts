import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { RedisTtlCache } from '../cache/redisTtlCache';

describe('RedisTtlCache', () => {
    let container: StartedTestContainer;
    let cache: RedisTtlCache;
    let key: string;
    let value: unknown;
    let ttlMilliseconds: number;

    beforeAll(async () => {
        container = await new GenericContainer("redis")
            .withExposedPorts(6379)
            .start();

        cache = new RedisTtlCache(5000, {
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

    it('PutRecord', async () => {
        await cache.putRecord({ key, value, ttlMilliseconds });
    });

    test('Read Record', async () => {
        const storedValue = await cache.readRecord(key);

        expect(storedValue).toEqual({
            key,
            ttlMilliseconds,
            value
        });
    })

    test('Peek Record', async () => {
        const exists = await cache.peekRecord(key);

        expect(exists).toBeTruthy();
    });

    test('Delete Record', async () => {
        await cache.deleteRecord(key);
        const existsAfterDelete = await cache.peekRecord(key);

        expect(existsAfterDelete).toBeFalsy();
    });

    test('Check No Record', async () => {
        await Promise.resolve(setTimeout(async () => {}, ttlMilliseconds));
        const existsAfterTtl = await cache.peekRecord(key);
        expect(existsAfterTtl).toBeFalsy();
    });
});