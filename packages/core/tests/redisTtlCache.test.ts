import { RedisTtlCache } from '../cache/redisTtlCache';

describe('RedisTtlCache', () => {
    let cache: RedisTtlCache;

    beforeAll(() => {
        // Mock the Redis client
        // Override the RedisTtlCache's client with the mock client
        cache = new RedisTtlCache(5000);
    });

    afterAll(async () => {
        // Ensure the Redis client is disconnected after tests complete
        await cache.disconnect();
    });

    test('putRecord and readRecord', async () => {
        const key = 'testKey';
        const value = { data: 'testValue' };
        const ttlMilliseconds = 10000; // 10 seconds

        await cache.putRecord({ key, value, ttlMilliseconds });
        const storedValue = await cache.readRecord(key);

        expect(storedValue).toEqual(value);
    });

    test('peekRecord', async () => {
        const key = 'testKey';
        const exists = await cache.peekRecord(key);

        expect(exists).toBeTruthy();
    });

    test('deleteRecord', async () => {
        const key = 'testKey';
        await cache.deleteRecord(key);
        const existsAfterDelete = await cache.peekRecord(key);

        expect(existsAfterDelete).toBeFalsy();
    });
});