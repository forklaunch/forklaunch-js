import { ZodSchemaValidator, string } from '@forklaunch/validator/zod';
import { killPortProcess } from 'kill-port-process';
import forklaunchExpress, {
  forklaunchRouter
} from '../forklaunch.hyperExpress';

const zodSchemaValidator = new ZodSchemaValidator();

describe('Forklaunch Hyper-Express Tests', () => {
  let forklaunchApplication;
  let forklaunchRouterInstance;

  beforeAll(async () => {
    await killPortProcess(6935);

    forklaunchApplication = forklaunchExpress(zodSchemaValidator);
    forklaunchRouterInstance = forklaunchRouter(
      '/testpath',
      zodSchemaValidator
    );

    forklaunchRouterInstance.get(
      '/test',
      {
        name: 'Test',
        summary: 'Test Summary',
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send('Hello World');
      }
    );

    forklaunchRouterInstance.post(
      '/test',
      {
        name: 'Test',
        summary: 'Test Summary',
        body: {
          test: string
        },
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send(req.body.test);
      }
    );

    forklaunchRouterInstance.put(
      '/test',
      {
        name: 'Test',
        summary: 'Test Summary',
        body: {
          test: string
        },
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send(req.body.test);
      }
    );

    forklaunchRouterInstance.patch(
      '/test',
      {
        name: 'Test',
        summary: 'Test Summary',
        body: {
          test: string
        },
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send(req.body.test);
      }
    );

    forklaunchRouterInstance.delete(
      '/test',
      {
        name: 'Test',
        summary: 'Test Summary',
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send('Hello World');
      }
    );

    forklaunchApplication.use(forklaunchRouterInstance);

    await forklaunchApplication.listen(6935, () => {
      console.log('Server started');
    });
  });

  test('Get', async () => {
    const testGet = await fetch('http://localhost:6934/testpath/test', {
      method: 'GET'
    });

    expect(testGet.status).toBe(200);
    expect(await testGet.text()).toBe('Hello World');
  });

  test('Post', async () => {
    const testPost = await fetch('http://localhost:6934/testpath/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'Hello World' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(testPost.status).toBe(200);
    expect(await testPost.text()).toBe('Hello World');
  });

  test('Put', async () => {
    const testPut = await fetch('http://localhost:6934/testpath/test', {
      method: 'PUT',
      body: JSON.stringify({ test: 'Hello World' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(testPut.status).toBe(200);
    expect(await testPut.text()).toBe('Hello World');
  });

  test('Patch', async () => {
    const testPatch = await fetch('http://localhost:6934/testpath/test', {
      method: 'PATCH',
      body: JSON.stringify({ test: 'Hello World' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(testPatch.status).toBe(200);
    expect(await testPatch.text()).toBe('Hello World');
  });

  test('Delete', async () => {
    const testDelete = await fetch('http://localhost:6934/testpath/test', {
      method: 'DELETE'
    });

    expect(testDelete.status).toBe(200);
    expect(await testDelete.text()).toBe('Hello World');
  });

  afterAll(async () => {
    setTimeout(async () => await killPortProcess(6935), 500);
  });
});
