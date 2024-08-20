import fetchMock from 'fetch-mock';
import { universalSdk } from '../index';
import { RequestType, ResponseType } from '../src/types/sdkTypes';

describe('universalSdk tests', () => {
  const sdk = universalSdk<{
    get: (route: string, request?: RequestType) => Promise<ResponseType>;
    post: (route: string, request?: RequestType) => Promise<ResponseType>;
    put: (route: string, request?: RequestType) => Promise<ResponseType>;
    patch: (route: string, request?: RequestType) => Promise<ResponseType>;
    delete: (route: string) => Promise<ResponseType>;
  }>('https://api.example.com');

  beforeEach(() => {
    fetchMock.reset(); // Reset fetchMock before each test
  });

  afterAll(() => {
    fetchMock.restore(); // Restore fetchMock after all tests are done
  });

  test('GET request should be called with correct URL and method', async () => {
    fetchMock.getOnce('https://api.example.com/test', {
      status: 200,
      body: { message: 'Success' },
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await sdk.get('/test');
    expect(fetchMock.called('https://api.example.com/test')).toBe(true);
    expect(await response.content).toEqual({ message: 'Success' });
  });

  test('POST request should be called with correct URL, method, headers, and body', async () => {
    fetchMock.postOnce('https://api.example.com/test', {
      status: 201,
      body: { message: 'Created' },
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await sdk.post('/test', {
      body: { key: 'value' },
      headers: { Authorization: 'Bearer token' }
    });

    expect(fetchMock.called('https://api.example.com/test')).toBe(true);
    const lastCall = fetchMock.lastCall('https://api.example.com/test');
    expect(lastCall?.[1]?.method).toBe('POST');
    expect(lastCall?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token'
    });
    expect(lastCall?.[1]?.body).toBe(JSON.stringify({ key: 'value' }));
    expect(await response.content).toEqual({ message: 'Created' });
  });

  test('PUT request should be called with correct URL and method', async () => {
    fetchMock.putOnce('https://api.example.com/test/123', {
      status: 200,
      body: { message: 'Updated' },
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await sdk.put('/test/123', {
      body: { key: 'updatedValue' },
      headers: { Authorization: 'Bearer token' }
    });

    expect(fetchMock.called('https://api.example.com/test/123')).toBe(true);
    const lastCall = fetchMock.lastCall('https://api.example.com/test/123');
    expect(lastCall?.[1]?.method).toBe('PUT');
    expect(lastCall?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token'
    });
    expect(lastCall?.[1]?.body).toBe(JSON.stringify({ key: 'updatedValue' }));
    expect(await response.content).toEqual({ message: 'Updated' });
  });

  test('PATCH request should be called with correct URL and method', async () => {
    fetchMock.patchOnce('https://api.example.com/test/123', {
      status: 200,
      body: { message: 'Patched' },
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await sdk.patch('/test/123', {
      body: { key: 'patchedValue' },
      headers: { Authorization: 'Bearer token' }
    });

    expect(fetchMock.called('https://api.example.com/test/123')).toBe(true);
    const lastCall = fetchMock.lastCall('https://api.example.com/test/123');
    expect(lastCall?.[1]?.method).toBe('PATCH');
    expect(lastCall?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token'
    });
    expect(lastCall?.[1]?.body).toBe(JSON.stringify({ key: 'patchedValue' }));
    expect(await response.content).toEqual({ message: 'Patched' });
  });

  test('DELETE request should be called with correct URL and method', async () => {
    fetchMock.deleteOnce('https://api.example.com/test/123', {
      status: 204,
      headers: {}
    });

    const response = await sdk.delete('/test/123');
    expect(fetchMock.called('https://api.example.com/test/123')).toBe(true);
    const lastCall = fetchMock.lastCall('https://api.example.com/test/123');
    expect(lastCall?.[1]?.method).toBe('DELETE');
    expect(response.code).toBe(204);
  });
});
