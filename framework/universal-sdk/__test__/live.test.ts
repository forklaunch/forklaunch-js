import { universalSdkBuilder } from '..';
import { SDK } from '../../hyper-express/test';

(async () => {
  const sdkBuilder = universalSdkBuilder<SDK>();
  const sdk = await sdkBuilder({
    host: 'http://localhost:6935',
    registryOptions: {
      path: 'api/v1/openapi'
    }
  });

  const getTest = await sdk.getTest.get('/testpath/test');
  if (getTest.code === 200) {
    console.log(getTest.response);
  }

  const postTest = await sdk.postTest.post('/testpath/test', {
    body: {
      f: '!',
      m: [1, 2, 3]
    }
  });
  if (postTest.code === 200) {
    for await (const chunk of postTest.response) {
      console.log(
        `chunk.id: ${chunk.id}, chunk.data.message: ${chunk.data.message}`
      );
    }
  }

  const jsonPatchTest = await sdk.jsonPatchTest.patch('/testpath/test', {
    body: {
      f: 'ok',
      h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
    }
  });
  if (jsonPatchTest.code === 200) {
    console.log(jsonPatchTest.response);
  }

  const multipartTest = await sdk.multipartTest.post(
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
  if (multipartTest.code === 200) {
    console.log(multipartTest.response);
  }

  const urlEncodedFormTest = await sdk.urlEncodedFormTest.post(
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
  if (urlEncodedFormTest.code === 200) {
    console.log(urlEncodedFormTest.response);
  }
})();
