import { universalSdk } from '@forklaunch/universal-sdk';
import { Server } from 'http';
import { SDK, start } from '../servers/express-zod';

describe('universalSdkBasic', async () => {
  const server: Server = start();
  let sdk: { m: SDK };

  beforeAll(() => {
    start();
  });

  afterAll(() => {
    server.close();
  });

  it('should build and call SDK', async () => {
    sdk = await universalSdk<{ m: SDK }>({
      host: 'http://localhost:6935',
      registryOptions: {
        path: 'api/v1/openapi'
      },
      contentTypeParserMap: {
        'custom/content': 'json'
      }
    });
    expect(sdk).toBeDefined();
  });

  it('should call getTest', async () => {
    sdk = await universalSdk<{ m: SDK }>({
      host: 'http://localhost:6935',
      registryOptions: {
        path: 'api/v1/openapi'
      },
      contentTypeParserMap: {
        'custom/content': 'json'
      }
    });
    const getTest = await sdk.m.getTest.get('/testpath/test');
    expect(getTest.code).toBe(200);
  });

  it('should call postTest', async () => {
    sdk = await universalSdk<{ m: SDK }>({
      host: 'http://localhost:6935',
      registryOptions: {
        path: 'api/v1/openapi'
      },
      contentTypeParserMap: {
        'custom/content': 'json'
      }
    });
    const postTest = await sdk.m.postTest.post('/testpath/test', {
      body: {
        f: '!',
        m: [1, 2, 3]
      }
    });
    expect(postTest.code).toBe(200);
  });

  it('should call jsonPatchTest', async () => {
    sdk = await universalSdk<{ m: SDK }>({
      host: 'http://localhost:6935',
      registryOptions: {
        path: 'api/v1/openapi'
      },
      contentTypeParserMap: {
        'custom/content': 'json'
      }
    });
    const jsonPatchTest = await sdk.m.jsonPatchTest.patch('/testpath/test', {
      body: {
        f: 'ok',
        h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
      }
    });
    expect(jsonPatchTest.code).toBe(200);
  });

  it('should call multipartTest', async () => {
    sdk = await universalSdk<{ m: SDK }>({
      host: 'http://localhost:6935',
      registryOptions: {
        path: 'api/v1/openapi'
      },
      contentTypeParserMap: {
        'custom/content': 'json'
      }
    });
    const multipartTest = await sdk.m.multipartTest.post(
      '/testpath/test/multipart',
      {
        body: {
          multipartForm: {
            f: '!',
            g: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
          }
        }
      }
    );
    expect(multipartTest.code).toBe(200);
  });

  it('should call urlEncodedFormTest', async () => {
    sdk = await universalSdk<{ m: SDK }>({
      host: 'http://localhost:6935',
      registryOptions: {
        path: 'api/v1/openapi'
      },
      contentTypeParserMap: {
        'custom/content': 'json'
      }
    });
    const urlEncodedFormTest = await sdk.m.urlEncodedFormTest.post(
      '/testpath/test/url-encoded-form',
      {
        body: {
          urlEncodedForm: {
            f: '!',
            h: 444
          }
        }
      }
    );
    expect(urlEncodedFormTest.code).toBe(200);
  });
});
