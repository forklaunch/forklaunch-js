import { universalSdk } from '@forklaunch/universal-sdk';
import { Server } from 'http';
import { setTimeout } from 'timers/promises';
import { SDK, start } from '../servers/express-zod';

async function instantiateSdk() {
  return await universalSdk<SDK>({
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
  let client: SDK;

  beforeAll(async () => {
    start();
    await setTimeout(500);
  });

  afterAll(() => {
    server.close();
  });

  it('should build and call SDK', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    expect(client).toBeDefined();
  });

  it('should call getTest', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const getTest = await client.sdk.testpath.testFile({
      headers: {
        authorization: 'bb YmFzaWN1c2VyOnBhc3N3b3Jk'
      }
    });
    expect(getTest.code).toBe(200);
  });

  it('should call getTest fetch', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const getTest = await client.fetch('/testpath/test', {
      method: 'GET',
      headers: {
        authorization: 'bb YmFzaWN1c2VyOnBhc3N3b3Jk'
      }
    });
    expect(getTest.code).toBe(200);
  });

  it('should call postTest', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const postTest = await client.sdk.testpath.testSse({
      headers: {
        xyz: 'Basic YmFzaWN1c2VyOnBhc3N3b3Jk'
      },
      body: {
        f: '!',
        m: [1, 2, 3]
      }
    });
    expect(postTest.code).toBe(200);
  });

  it('should call postTest fetch', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const postTest = await client.fetch('/testpath/test', {
      headers: {
        xyz: 'Basic YmFzaWN1c2VyOnBhc3N3b3Jk'
      },
      method: 'POST',
      body: {
        f: '!',
        m: [1, 2, 3]
      }
    });
    expect(postTest.code).toBe(200);
  });

  it('should call jsonPatchTest', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const jsonPatchTest = await client.sdk.testpath.testJsonPatch({
      headers: {
        authorization:
          'bb eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' // random valid jwt token
      },
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

  it('should call jsonPatchTest fetch', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const jsonPatchTest = await client.fetch('/testpath/test', {
      method: 'PATCH',
      headers: {
        authorization: 'bb string'
      },
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
    if (!client) {
      client = await instantiateSdk();
    }
    const multipartTest = await client.sdk.testpath.testMultipart({
      headers: {
        'x-test': 'test'
      },
      body: {
        multipartForm: {
          fileName: '!',
          g: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
        }
      }
    });
    expect(multipartTest.code).toBe(200);
  });

  it('should call multipartTest fetch', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const multipartTest = await client.fetch('/testpath/test/multipart', {
      method: 'POST',
      headers: {
        'x-test': 'test'
      },
      body: {
        multipartForm: {
          fileName: '!',
          g: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
        }
      }
    });
    expect(multipartTest.code).toBe(200);
  });

  it('should call urlEncodedFormTest', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const urlEncodedFormTest = await client.sdk.testpath.testUrlEncodedForm({
      params: {
        id: '123'
      },
      body: {
        urlEncodedForm: {
          f: '!',
          h: 444
        }
      }
    });
    expect(urlEncodedFormTest.code).toBe(200);
  });

  it('should call urlEncodedFormTest fetch', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const urlEncodedFormTest = await client.fetch(
      '/testpath/test/url-encoded-form/:id',
      {
        method: 'POST',
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
    if (!client) {
      client = await instantiateSdk();
    }
    const filePostTest = await client.sdk.testpath.testFileUploadDownload({
      body: new File(['Hello World'], 'test2.txt', { type: 'text/plain' })
    });
    expect(filePostTest.code).toBe(200);
  });

  it('should call filePostTest fetch', async () => {
    if (!client) {
      client = await instantiateSdk();
    }
    const filePostTest = await client.fetch('/testpath/test/file', {
      method: 'POST',
      body: new File(['Hello World'], 'test2.txt', { type: 'text/plain' })
    });
    expect(filePostTest.code).toBe(200);
  });
});
