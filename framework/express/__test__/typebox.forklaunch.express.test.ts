import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { number, SchemaValidator, string } from '@forklaunch/validator/typebox';
import { Server } from 'http';
import { forklaunchExpress, forklaunchRouter } from '../index';
import { checkout } from '../src/handlers/checkout';
import { get } from '../src/handlers/get';
import { post } from '../src/handlers/post';

import { noop, Prettify, safeStringify } from '@forklaunch/common';
import {
  NextFunction as ExpressNextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse
} from 'express';

const expressMiddleware = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => {
  noop(req, res, next);
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
const nestedForklaunchRouterInstance = forklaunchRouter(
  '/nested',
  typeboxSchemaValidator,
  openTelemetryCollector
);

describe('Forklaunch Express Tests', () => {
  let server: Server;

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
      async (_req, res) => {
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

    server = await forklaunchApplication.listen(6934, () => {});
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
      body: safeStringify({ test: 'Hello World' }),
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
    server.close();
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

  it('should be able to create a path param handler', async () => {
    const getRequest = get(
      typeboxSchemaValidator,
      '/:id',
      {
        name: 'Get Organization',
        summary: 'Gets an organization by ID',
        responses: {
          200: number,
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
          res.status(200).json(organizationDto);
        } else {
          res.status(404).send('Organization not found');
        }
      }
    );

    application.get('/:id', getRequest);
    const liveTypeFunction = router.get('/:id', getRequest);
    await liveTypeFunction.fetch('/organization/:id', {
      method: 'GET',
      params: {
        id: 'string'
      },
      headers: {
        'x-test': 'string'
      }
    });
    await liveTypeFunction.fetchMap['/organization/:id']('/organization/:id', {
      method: 'GET',
      params: {
        id: '1234'
      },
      headers: {
        'x-test': 'jjjj'
      }
    });
  });

  it('should be able to create a body param handler', async () => {
    const postRequest = post(
      typeboxSchemaValidator,
      '/',
      {
        name: 'Create Organization',
        body: {
          json: {
            name: string
          }
        },
        summary: 'Creates an organization',
        responses: {
          200: {
            json: {
              name: string
            }
          },
          400: string
        }
      },
      async (req, res) => {
        res.status(200).json(req.body);
      }
    );
    application.post('/', postRequest);
    const liveTypeFunction = router.post('/', postRequest);
    const x = router.get(
      '/f',
      {
        name: 'Get Organization',
        summary: '',
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send('asdd');
      }
    );

    x.fetch('/organization/f');

    const nestedLiveTypeFunction = nestedForklaunchRouterInstance.post(
      '/',
      postRequest
    );
    nestedLiveTypeFunction.fetch('/nested', {
      method: 'POST',
      body: {
        json: {
          name: 'jasdfa'
        }
      }
    });
    const mf = forklaunchRouter(
      '/aaaa',
      SchemaValidator(),
      openTelemetryCollector
    );
    const cuf = forklaunchRouter(
      '/aaaa',
      SchemaValidator(),
      openTelemetryCollector
    );

    const buf = cuf.get(
      '/fff',
      {
        name: 'ok',
        summary: 'nice',
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send('afadfa');
      }
    );

    const lad = mf.get(
      '/lk',
      {
        name: 'off',
        summary: 'nice',
        responses: {
          200: string
        }
      },
      (req, res) => {
        res.status(200).send('afadfa');
      }
    );
    const m = nestedLiveTypeFunction.use(lad);
    const xo = liveTypeFunction.use(m);

    console.log('hello');
    const o = xo
      .use(
        (req, res, next) => {
          next();
        },
        (req, res, next) => {
          next();
        },
        lad
      )
      .use(buf);
    console.log('hello2');
    xo.use(
      // {
      //   params: {
      //     id: string
      //   }
      // },
      (req, res, next) => {
        next();
      }
    );

    type SdkClient<
      Routers extends (
        | { basePath: string; sdkName?: string; sdk: Record<string, unknown> }
        | ((...args: never[]) => {
            basePath: string;
            sdkName?: string;
            sdk: Record<string, unknown>;
          })
      )[]
    > = {
      [K in Routers[number] as 'ok']: //         never //         //   : K['sdkName'] //         //   ? K['basePath'] //       : // ? string extends K['sdkName'] //       ? 'rockester' //     : K extends { sdkName: string; basePath: string } //       : ReturnType<K>['sdkName'] //       ? ReturnType<K>['basePath'] //     ? string extends ReturnType<K>['sdkName'] //   } //     basePath: string; //     sdkName: string; //   K extends (...args: never[]) => { // PrettyCamelCase<
      // >
      Prettify<
        K extends (...args: never[]) => {
          sdk: Record<string, unknown>;
        }
          ? Prettify<ReturnType<K>['sdk']>
          : K extends { sdk: Record<string, unknown> }
            ? Prettify<K['sdk']>
            : never
      >;
      // [K in Routers[number] as PrettyCamelCase<
      //   K extends (...args: never[]) => {
      //     sdkName: string;
      //     basePath: string;
      //   }
      //     ? string extends ReturnType<K>['sdkName']
      //       ? ReturnType<K>['basePath']
      //       : ReturnType<K>['sdkName']
      //     : K extends { sdkName: string; basePath: string }
      //       ? string extends K['sdkName']
      //         ? K['basePath']
      //         : K['sdkName']
      //       : never
      // >]: K extends (...args: never[]) => {
      //   sdk: Record<string, unknown>;
      // }
      //   ? ReturnType<K>['sdk']
      //   : K extends { sdk: Record<string, unknown> }
      //     ? K['sdk']
      //     : never;
    };
    o.fetch('/organization/aaaa/fff');
    type A = Prettify<SdkClient<[typeof o]>>;
    const r: A = {};
    o.sdk.aaaa.off({});
    r.ok.aaaa.off();
    console.log('hello3');
    const l = await o.fetch('/organization/nested', {
      method: 'POST',
      body: {
        json: {
          name: 'string'
        }
      }
    });
    console.log('hello4');
    await liveTypeFunction.fetch('/organization', {
      method: 'POST',
      body: {
        json: {
          name: 'string'
        }
      }
    });
  });

  it('should be able to create a middleware handler', () => {
    const checkoutMiddleware = checkout(
      typeboxSchemaValidator,
      '/',
      {
        query: {
          name: string
        }
      },
      async (req) => {
        noop(req.query.name);
      }
    );
    console.log('hello5');
    application.use(checkoutMiddleware);
    console.log('hello6');
    router.checkout('/', checkoutMiddleware);
    console.log('hello7');
  });
});
