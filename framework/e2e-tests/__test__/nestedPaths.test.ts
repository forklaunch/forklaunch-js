import { flNestedRouter } from '../servers/express-zod';

describe('nestedPaths', () => {
  it('should call nested getTest', async () => {
    const getTest = await flNestedRouter.sdk.testFile['2.0.0']({
      headers: {
        authorization: 'bb string'
      }
    });
    expect(getTest.code).toBe(200);
  });

  it('should fetch nested getTest', async () => {
    const getTest = await flNestedRouter.fetch('/nested/test', {
      method: 'GET',
      headers: {
        authorization: 'bb string',
        'x-test': 'test'
      },
      version: '1.0.0'
    });
    expect(getTest.code).toBe(200);
  });

  it('should call nested postTest', async () => {
    const postTest = await flNestedRouter.sdk.testSse['2.0.0']({
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

  it('should fetch nested postTest', async () => {
    const postTest = await flNestedRouter.fetch('/nested/test', {
      method: 'POST',
      body: {
        f: '!',
        m: [1, 2, 3]
      },
      headers: {
        xyz: 'Basic string'
      },
      version: '1.0.0'
    });
    expect(postTest.code).toBe(200);
  });

  // it('should call nested jsonPatchTest', async () => {
  //   const jsonPatchTest = await flNestedRouter.sdk.testJsonPatch({
  //     body: {
  //       f: 'ok',
  //       h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
  //     },
  //     query: {
  //       q: 'test'
  //     },
  //     headers: {
  //       authorization: 'bb string'
  //     }
  //   });
  //   expect(jsonPatchTest.code).toBe(200);
  // });

  // it('should fetch nested jsonPatchTest', async () => {
  //   const jsonPatchTest = await flNestedRouter.fetch('/nested/test', {
  //     method: 'PATCH',
  //     body: {
  //       f: 'ok',
  //       h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
  //     },
  //     query: {
  //       q: 'test'
  //     },
  //     headers: {
  //       authorization: 'bb string'
  //     }
  //   });
  //   expect(jsonPatchTest.code).toBe(200);
  // });

  // it('should call nested multipartTest', async () => {
  //   const multipartTest = await flNestedRouter.sdk.testMultipart({
  //     headers: {
  //       'x-test': 'test'
  //     },
  //     body: {
  //       multipartForm: {
  //         fileName: '!',
  //         g: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
  //       }
  //     }
  //   });
  //   expect(multipartTest.code).toBe(200);
  // });

  // it('should fetch nested multipartTest', async () => {
  //   const multipartTest = await sampleSdkClient2.fetch(
  //     '/testpath/test/multipart',
  //     {
  //       method: 'POST',
  //       body: {
  //         multipartForm: {
  //           fileName: '!',
  //           g: new File(['Hello World'], 'test.txt', { type: 'text/plain' })
  //         }
  //       },
  //       headers: {
  //         'x-test': 'test'
  //       }
  //     }
  //   );
  //   expect(multipartTest.code).toBe(200);
  // });

  // it('should call nested urlEncodedFormTest', async () => {
  //   const urlEncodedFormTest =
  //     await sampleSdkClient2.sdk.sample.path.a.b.testUrlEncodedForm({
  //       params: {
  //         id: '123'
  //       },
  //       body: {
  //         urlEncodedForm: {
  //           f: '!',
  //           h: 444
  //         }
  //       }
  //     });
  //   expect(urlEncodedFormTest.code).toBe(200);
  // });

  // it('should fetch nested urlEncodedFormTest', async () => {
  //   const urlEncodedFormTest = await sampleSdkClient2.fetch(
  //     '/testpath/test/url-encoded-form/:id',
  //     {
  //       method: 'POST',
  //       body: {
  //         urlEncodedForm: {
  //           f: '!',
  //           h: 444
  //         }
  //       },
  //       params: {
  //         id: '123'
  //       }
  //     }
  //   );
  //   expect(urlEncodedFormTest.code).toBe(200);
  // });

  // it('should call nested filePostTest', async () => {
  //   const filePostTest =
  //     await sampleSdkClient2.sdk.sample.path.a.b.nested.testFile['1.0.0']({
  //       headers: {
  //         'x-test': 'test',
  //         authorization: 'bb string'
  //       }
  //     });
  //   expect(filePostTest.code).toBe(200);
  // });

  // it('should fetch nested filePostTest', async () => {
  //   const filePostTest = await sampleSdkClient2.fetch('/testpath/nested/test', {
  //     method: 'GET',
  //     headers: {
  //       'x-test': 'test',
  //       authorization: 'bb string'
  //     },
  //     version: '1.0.0'
  //   });
  //   expect(filePostTest.code).toBe(200);
  // });
});
