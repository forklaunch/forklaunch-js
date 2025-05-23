import { universalSdk } from '@forklaunch/universal-sdk';
import { SDK } from '../servers/express-zod';

console.log('universalSdkBasic');
(async () => {
  try {
    console.log('universalSdkBasic');
    console.log('Building SDK...');
    const sdk = await universalSdk<{ m: SDK }>({
      host: 'http://localhost:6935',
      registryOptions: {
        path: 'api/v1/openapi'
      },
      contentTypeParserMap: {
        'custom/content': 'json'
      }
    });
    console.log('SDK built:', !!sdk);

    console.log('Calling getTest...');
    const getTest = await sdk.m.getTest.get('/testpath/test');
    if (getTest.code === 200) {
      console.log('getTest response:', getTest.response);
    } else {
      console.log('getTest error:', getTest.response);
    }

    console.log('Calling postTest...');
    const postTest = await sdk.m.postTest.post('/testpath/test', {
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
    } else {
      console.log('postTest error:', postTest.response);
    }

    console.log('Calling jsonPatchTest...');
    const jsonPatchTest = await sdk.m.jsonPatchTest.patch('/testpath/test', {
      body: {
        f: 'ok',
        h: 'b658f7e0-9b8a-4e1f-b6d8-1c0b7d8b3f59'
      }
    });
    if (jsonPatchTest.code === 200) {
      console.log('jsonPatchTest response:', jsonPatchTest.response);
    } else {
      console.log('jsonPatchTest error:', jsonPatchTest.response);
    }

    console.log('Calling multipartTest...');
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
    if (multipartTest.code === 200) {
      console.log('multipartTest response:', multipartTest.response);
    } else {
      console.log('multipartTest error:', multipartTest.response);
    }

    console.log('Calling urlEncodedFormTest...');
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
    if (urlEncodedFormTest.code === 200) {
      console.log('urlEncodedFormTest response:', urlEncodedFormTest.response);
    } else {
      console.log('urlEncodedFormTest error:', urlEncodedFormTest.response);
    }
    console.log('All tests completed.');
  } catch (err) {
    console.error('Caught error:', err);
    process.exit(1);
  }
})();
