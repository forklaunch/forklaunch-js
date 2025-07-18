import { sdkRouter } from '../servers/express-zod';

describe('liveTests', () => {
  it('should call getTest', async () => {
    const getTest = await sdkRouter.sdk.testFile({
      headers: {
        authorization: 'bb string'
      }
    });
    expect(getTest.code).toBe(200);
  });

  it('should fetch getTest', async () => {
    const getTest = await sdkRouter.fetch('/testpath/test', {
      method: 'GET',
      headers: {
        authorization: 'bb string'
      }
    });
    expect(getTest.code).toBe(200);
  });

  it('should call postTest', async () => {
    const postTest = await sdkRouter.sdk.testSse({
      headers: {
        xyz: 'Basic string'
      },
      body: {
        f: '!',
        m: [1, 2, 3]
      }
    });
    expect(postTest.code).toBe(200);
  });

  it('should fetch postTest', async () => {
    const postTest = await sdkRouter.fetch('/testpath/test', {
      method: 'POST',
      body: {
        f: '!',
        m: [1, 2, 3]
      },
      headers: {
        xyz: 'Basic string'
      }
    });
    expect(postTest.code).toBe(200);
  });

  it('should call jsonPatchTest', async () => {
    const jsonPatchTest = await sdkRouter.sdk.testJsonPatch({
      body: {
        f: 'ok',
        h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
      },
      query: {
        q: 'test'
      },
      headers: {
        authorization: 'bb string'
      }
    });
    expect(jsonPatchTest.code).toBe(200);
  });

  it('should fetch jsonPatchTest', async () => {
    const jsonPatchTest = await sdkRouter.fetch('/testpath/test', {
      method: 'PATCH',
      body: {
        f: 'ok',
        h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
      },
      query: {
        q: 'test'
      },
      headers: {
        authorization: 'bb string'
      }
    });
    expect(jsonPatchTest.code).toBe(200);
  });

  it('should call multipartTest', async () => {
    const multipartTest = await sdkRouter.sdk.testMultipart({
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

  it('should fetch multipartTest', async () => {
    const multipartTest = await sdkRouter.fetch('/testpath/test/multipart', {
      method: 'POST',
      body: {
        multipartForm: {
          fileName: '!',
          g: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
        }
      },
      headers: {
        'x-test': 'test'
      }
    });
    expect(multipartTest.code).toBe(200);
  });

  it('should call urlEncodedFormTest', async () => {
    const urlEncodedFormTest = await sdkRouter.sdk.testUrlEncodedForm({
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

  it('should fetch urlEncodedFormTest', async () => {
    const urlEncodedFormTest = await sdkRouter.fetch(
      '/testpath/test/url-encoded-form/:id',
      {
        method: 'POST',
        body: {
          urlEncodedForm: {
            f: '!',
            h: 444
          }
        },
        params: {
          id: '123'
        }
      }
    );
    expect(urlEncodedFormTest.code).toBe(200);
  });

  it('should call filePostTest', async () => {
    const filePostTest = await sdkRouter.sdk.testFileUploadDownload({
      body: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
    });
    expect(filePostTest.code).toBe(200);
  });

  it('should fetch filePostTest', async () => {
    const filePostTest = await sdkRouter.fetch('/testpath/test/file', {
      method: 'POST',
      body: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
    });
    expect(filePostTest.code).toBe(200);
  });
});
