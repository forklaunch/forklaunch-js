import fetchMock from 'fetch-mock';
import { universalSdkBuilder } from '../index';
import { RequestType, ResponseType } from '../src/types/sdk.types';

describe.skip('universalSdk tests', async () => {
  const sdk = await universalSdkBuilder<{
    get: (route: string, request?: RequestType) => Promise<ResponseType>;
    post: (route: string, request?: RequestType) => Promise<ResponseType>;
    put: (route: string, request?: RequestType) => Promise<ResponseType>;
    patch: (route: string, request?: RequestType) => Promise<ResponseType>;
    delete: (route: string) => Promise<ResponseType>;
  }>()({
    host: 'https://api.example.com',
    registryOptions: {
      path: 'api/v1/openapi'
    },
    contentTypeParserMap: {}
  });

  beforeEach(() => {
    fetchMock.clearHistory();
    fetchMock.removeRoutes();
  });

  afterAll(() => {
    fetchMock.clearHistory();
    fetchMock.removeRoutes();
  });

  test('GET request should be called with correct URL and method', async () => {
    fetchMock.getOnce('https://api.example.com/test', {
      status: 200,
      body: { message: 'Success' },
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await sdk.get('/test');
    expect(fetchMock.callHistory.called('https://api.example.com/test')).toBe(
      true
    );
    expect(response.code).toBe(200);
    expect(response.response).toEqual({ message: 'Success' });
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

    expect(fetchMock.callHistory.called('https://api.example.com/test')).toBe(
      true
    );
    const lastCall = fetchMock.callHistory.lastCall(
      'https://api.example.com/test'
    );

    expect(lastCall?.request?.method).toBe('POST');
    expect(lastCall?.request?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token'
    });
    expect(lastCall?.request?.body).toBe(JSON.stringify({ key: 'value' }));
    expect(response.code).toBe(201);
    expect(response.response).toEqual({ message: 'Created' });
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

    expect(
      fetchMock.callHistory.called('https://api.example.com/test/123')
    ).toBe(true);
    const lastCall = fetchMock.callHistory.lastCall(
      'https://api.example.com/test/123'
    );
    expect(lastCall?.request?.method).toBe('PUT');
    expect(lastCall?.request?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token'
    });
    expect(lastCall?.request?.body).toBe(
      JSON.stringify({ key: 'updatedValue' })
    );
    expect(response.code).toBe(200);
    expect(response.response).toEqual({ message: 'Updated' });
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

    expect(
      fetchMock.callHistory.called('https://api.example.com/test/123')
    ).toBe(true);
    const lastCall = fetchMock.callHistory.lastCall(
      'https://api.example.com/test/123'
    );
    expect(lastCall?.request?.method).toBe('PATCH');
    expect(lastCall?.request?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token'
    });
    expect(lastCall?.request?.body).toBe(
      JSON.stringify({ key: 'patchedValue' })
    );
    expect(response.code).toBe(200);
    expect(response.response).toEqual({ message: 'Patched' });
  });

  test('DELETE request should be called with correct URL and method', async () => {
    fetchMock.deleteOnce('https://api.example.com/test/123', {
      status: 204,
      headers: {}
    });

    const response = await sdk.delete('/test/123');
    expect(
      fetchMock.callHistory.called('https://api.example.com/test/123')
    ).toBe(true);
    const lastCall = fetchMock.callHistory.lastCall(
      'https://api.example.com/test/123'
    );
    expect(lastCall?.request?.method).toBe('DELETE');
    expect(response.code).toBe(204);
  });
});
