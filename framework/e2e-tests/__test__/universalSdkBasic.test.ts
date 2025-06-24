import { universalSdk } from '@forklaunch/universal-sdk';
import { Server } from 'http';
import { SDK, start } from '../servers/express-zod';

async function instantiateSdk() {
  return await universalSdk<{ m: SDK }>({
    host: 'http://localhost:6935',
    registryOptions: {
      path: 'api/v1/openapi'
    },
    contentTypeParserMap: {
      'custom/content': 'json'
    }
  });
}

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
    if (!sdk) {
      sdk = await instantiateSdk();
    }
    expect(sdk).toBeDefined();
  });

  it('should call getTest', async () => {
    if (!sdk) {
      sdk = await instantiateSdk();
    }
    const getTest = await sdk.m.getTest.get('/testpath/test');
    expect(getTest.code).toBe(200);
  });

  it('should call postTest', async () => {
    if (!sdk) {
      sdk = await instantiateSdk();
    }
    const postTest = await sdk.m.postTest.post('/testpath/test', {
      body: {
        f: '!',
        m: [1, 2, 3]
      }
    });
    expect(postTest.code).toBe(200);
  });

  it('should call jsonPatchTest', async () => {
    if (!sdk) {
      sdk = await instantiateSdk();
    }
    const jsonPatchTest = await sdk.m.jsonPatchTest.patch('/testpath/test', {
      body: {
        f: 'ok',
        h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
      },
      query: {
        q: 'test'
      }
    });
    expect(jsonPatchTest.code).toBe(200);
  });

  it('should call multipartTest', async () => {
    if (!sdk) {
      sdk = await instantiateSdk();
    }
    const multipartTest = await sdk.m.multipartTest.post(
      '/testpath/test/multipart',
      {
        headers: {
          'x-test': 'test'
        },
        body: {
          multipartForm: {
            fileName: '!',
            g: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
          }
        }
      }
    );
    expect(multipartTest.code).toBe(200);
  });

  it('should call urlEncodedFormTest', async () => {
    if (!sdk) {
      sdk = await instantiateSdk();
    }
    const urlEncodedFormTest = await sdk.m.urlEncodedFormTest.post(
      '/testpath/test/url-encoded-form/:id',
      {
        params: {
          id: '123'
        },
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

  it('should call filePostTest', async () => {
    if (!sdk) {
      sdk = await instantiateSdk();
    }
    const filePostTest = await sdk.m.filePostTest.post('/testpath/test/file', {
      body: new File(['Hello World'], 'test2.txt', { type: 'text/plain' })
    });
    expect(filePostTest.code).toBe(200);
  });
});
