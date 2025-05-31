import { liveTests } from '../servers/express-zod';

describe('liveTests', () => {
  const sdk = { m: liveTests };

  it('should call getTest', async () => {
    const getTest = await sdk.m.getTest.get('/testpath/test');
    expect(getTest.code).toBe(200);
  });

  it('should call postTest', async () => {
    const postTest = await sdk.m.postTest.post('/testpath/test', {
      body: {
        f: '!',
        m: [1, 2, 3]
      }
    });
    expect(postTest.code).toBe(200);
  });

  it('should call jsonPatchTest', async () => {
    const jsonPatchTest = await sdk.m.jsonPatchTest.patch('/testpath/test', {
      body: {
        f: 'ok',
        h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
      }
    });
    expect(jsonPatchTest.code).toBe(200);
  });

  it('should call multipartTest', async () => {
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
