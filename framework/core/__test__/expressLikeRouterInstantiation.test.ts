/* eslint-disable @typescript-eslint/no-unused-vars */
import { isNever } from '@forklaunch/common';
import {
  date,
  number,
  SchemaValidator,
  string
} from '@forklaunch/validator/typebox';
import {
  ForklaunchExpressLikeRouter,
  MetricsDefinition,
  OpenTelemetryCollector,
  typedHandler
} from '../src/http';
import { typedAuthHandler } from '../src/http/handlers/typedAuthHandler';

// TODO: write tests

const contractDetails = {
  name: 'string',
  summary: 'string',
  params: {
    name: string,
    id: number
    // a: string
  },
  requestHeaders: {
    'x-test': number
  },
  responses: {
    200: date,
    400: string
  }
};

const kl = typedAuthHandler(SchemaValidator(), contractDetails, (sub, req) => {
  // const j = req?.params.id;
  // const x = req?.headers['x-test'];
  return new Set(['admin', 'user']);
});

const xasd = typedHandler(
  SchemaValidator(),
  '/test/:name/:id',
  'trace',
  {
    name: 'string',
    summary: 'string',
    params: {
      name: string,
      id: number
    },
    requestHeaders: {
      'x-test': number
    },
    responseHeaders: {
      'x-test': number
    },
    query: {
      a: number
    },
    responses: {
      200: date,
      400: string
    },
    auth: {
      basic: {
        login: (username: string, password: string) => {
          return username === 'test' && password === 'test';
        }
      },
      mapPermissions: kl,
      // (sub, req) => {
      //   const j = req?.params.id;
      //   return new Set(['admin', 'user']);
      // },
      allowedPermissions: new Set(['admin', 'user'])
    }
  },
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * req.query.a;
    const l = res.getHeaders()['x-correlation-id'];
  },
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
    res.setHeader('x-test', 'ffff');
    res.status(200).send(new Date());
  }
);

const xa = new ForklaunchExpressLikeRouter(
  '/l',
  SchemaValidator(),
  {
    use: () => {},
    get: () => {},
    post: () => {},
    put: () => {},
    delete: () => {},
    all: () => {},
    connect: () => {},
    patch: () => {},
    options: () => {},
    head: () => {},
    trace: () => {}
  },
  [],
  {} as OpenTelemetryCollector<MetricsDefinition>
);

const bl = xa.trace(
  '/test/:name/:id',
  {
    name: 'string',
    summary: 'string',
    params: {
      name: string,
      id: number
      // a: string
    },
    requestHeaders: {
      'x-test': number
    },
    responses: {
      200: {
        json: {
          n: date
        }
      },
      400: string
    },
    auth: {
      // mapPermissions: (sub, req) => {
      //   const j = req?.params.id;
      //   return new Set(['admin', 'user']);
      // },
      mapPermissions: kl,
      mapRoles: kl,
      allowedPermissions: new Set(['admin', 'user'])
    }
  },
  async (req, res) => {
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
    res.status(200).send({ n: new Date() });
  }
);

const a = xa.trace(
  '/test/:name/:id',
  contractDetails,
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
  },
  async (req, res) => {
    // const r = req.params.a;
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
    res.status(200).send(new Date());
  }
);

const b = xa.trace(
  '/test/:name/:id',
  async (req, res) => {
    const i = req.headers['x-test'] * 7;
    const l = res.getHeaders()['x-correlation-id'];
    res.status(200).send(new Date());
  },
  xasd
);

const c = xa.trace('/test/:name/:id', xasd);

const fff = typedHandler(
  SchemaValidator(),
  '/test/:name/:id',
  'trace',
  {
    name: 'string',
    summary: 'string',
    params: {
      name: string,
      id: number
    },
    versions: {
      '1.0.0': {
        requestHeaders: {
          'x-test': number
        },
        responses: {
          200: date,
          400: string
        }
      },
      '4': {
        requestHeaders: {
          'x-test': string
        },
        responses: {
          200: string,
          400: number
        }
      }
    },
    auth: {
      basic: {
        login: (username: string, password: string) => {
          return username === 'test' && password === 'test';
        }
      },
      mapPermissions: (sub, req) => {
        const version = req?.version;
        switch (version) {
          case '1.0.0':
            return new Set(['admin']);
          case '4':
            return new Set(['user']);
          case undefined:
            return new Set(['admin', 'user']);
          default:
            isNever(version);
            return new Set(['admin', 'user']);
        }
      },
      allowedPermissions: new Set(['admin', 'user'])
    }
  },
  async (req, res) => {
    // const r = req.params.a;
    const version = req.version;
    switch (version) {
      case '1.0.0': {
        const x = req.headers['x-test'] * 5;
        break;
      }
      case '4': {
        const y = req.headers['x-test'].charAt(0);
        break;
      }
      default:
        isNever(version);
    }
    const l = res.getHeaders()['x-correlation-id'];
  },
  async (req, res) => {
    // const r = req.params.a;
    const version = res.version;
    switch (version) {
      case '1.0.0': {
        res.status(200).send(new Date());
        break;
      }
      case '4': {
        res.status(200).send('the version is 4');
        break;
      }
      default:
        isNever(version);
    }
  }
);

xa.all(contractDetails, async (req, res) => {});
