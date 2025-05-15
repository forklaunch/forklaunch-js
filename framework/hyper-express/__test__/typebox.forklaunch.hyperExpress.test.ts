import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { number, SchemaValidator, string } from '@forklaunch/validator/typebox';
import { forklaunchExpress, forklaunchRouter } from '../index';
import { any } from '../src/handlers/any';
import { get } from '../src/handlers/get';
import { post } from '../src/handlers/post';

import {
  MiddlewareNext as ExpressNextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse
} from '@forklaunch/hyper-express-fork';

const expressMiddleware = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => {
  console.log(req, res, next);
  next();
};

const typeboxSchemaValidator = SchemaValidator();
const openTelemetryCollector = new OpenTelemetryCollector('test');

const forklaunchApplication = forklaunchExpress(
  typeboxSchemaValidator,
  openTelemetryCollector
);
const forklaunchRouterInstance = forklaunchRouter(
  '/testpath',
  typeboxSchemaValidator,
  openTelemetryCollector
);

describe('Forklaunch Hyper-Express Tests', () => {
  beforeAll(async () => {
    forklaunchRouterInstance.get(
      '/test',
      {
        name: 'Test',
        summary: 'Test Summary',
        responses: {
          200: string
        }
      },
      expressMiddleware,
      (_req, res) => {
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
      expressMiddleware,
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
      (_req, res) => {
        res.status(200).send('Hello World');
      }
    );

    forklaunchApplication.use(forklaunchRouterInstance);

    await forklaunchApplication.listen(6936, () => {
      console.log('server started on 6936');
    });
  });

  test('Get', async () => {
    const testGet = await fetch('http://localhost:6936/testpath/test', {
      method: 'GET'
    });

    expect(testGet.status).toBe(200);
    expect(await testGet.text()).toBe('Hello World');
  });

  test('Post', async () => {
    const testPost = await fetch('http://localhost:6936/testpath/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'Hello World' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(testPost.status).toBe(200);
    expect(await testPost.text()).toBe('Hello World');
  });

  test('Put', async () => {
    const testPut = await fetch('http://localhost:6936/testpath/test', {
      method: 'PUT',
      body: JSON.stringify({ test: 'Hello World' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(testPut.status).toBe(200);
    expect(await testPut.text()).toBe('Hello World');
  });

  test('Patch', async () => {
    const testPatch = await fetch('http://localhost:6936/testpath/test', {
      method: 'PATCH',
      body: JSON.stringify({ test: 'Hello World' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(testPatch.status).toBe(200);
    expect(await testPatch.text()).toBe('Hello World');
  });

  test('Delete', async () => {
    const testDelete = await fetch('http://localhost:6936/testpath/test', {
      method: 'DELETE'
    });

    expect(testDelete.status).toBe(200);
    expect(await testDelete.text()).toBe('Hello World');
  });

  afterAll(async () => {
    forklaunchApplication.internal.shutdown();
  });
});

describe('handlers', () => {
  const application = forklaunchExpress(
    typeboxSchemaValidator,
    openTelemetryCollector
  );
  const router = forklaunchRouter(
    '/organization',
    typeboxSchemaValidator,
    openTelemetryCollector
  );

  it('should be able to create a path param handler', () => {
    const getRequest = get(
      typeboxSchemaValidator,
      '/:id',
      {
        name: 'Get Organization',
        summary: 'Gets an organization by ID',
        responses: {
          200: {
            ret: number
          },
          404: string
        },
        params: {
          id: string
        },
        requestHeaders: {
          'x-test': string
        },
        auth: {
          method: 'jwt',
          allowedRoles: new Set(['admin']),
          mapRoles: (sub, req) => {
            return new Set(['admin', sub, req?.params.id ?? '']);
          }
        }
      },
      async (req, res) => {
        const organizationDto = Number(req.params.id);
        if (organizationDto) {
          res.status(200).json({
            ret: organizationDto
          });
        } else {
          res.status(404).send('Organization not found');
        }
      }
    );
    application.get('/:id', getRequest);
    const liveTypeFunction = router.get('/:id', getRequest);
    liveTypeFunction.get('/organization/:id', {
      params: {
        id: 'string'
      },
      headers: {
        'x-test': 'string'
      }
    });
  });

  it('should be able to create a body param handler', () => {
    const postRequest = post(
      typeboxSchemaValidator,
      '/',
      {
        name: 'Create Organization',
        summary: 'Creates an organization',
        responses: {
          200: {
            name: string
          }
        },
        body: {
          name: string
        }
      },
      async (req, res) => {
        res.status(200).json(req.body);
      }
    );
    application.post('/', postRequest);
    const liveTypeFunction = router.post('/', postRequest);
    liveTypeFunction.post('/organization', {
      body: {
        name: 'string'
      }
    });
  });

  it('should be able to create a middleware handler', () => {
    const anyMiddleware = any(
      typeboxSchemaValidator,
      '/',
      {
        query: {
          name: string
        }
      },
      async (req) => {
        if (req.query.name) {
          throw new Error('Name is required');
        }
      }
    );
    application.use(anyMiddleware);
    router.any('/', anyMiddleware);
  });
});
