/* eslint-disable @typescript-eslint/no-unused-vars */
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
  const j = req?.params.id;
  const x = req?.headers['x-test'];
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
    responses: {
      200: date,
      400: string
    },
    auth: {
      method: 'jwt',
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
      method: 'jwt',
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

xa.post('/ok', {
  name: 'string',
  summary: 'string',
  body: {
    contentType: 'text/plain',
    text: {
      f: string
    }
  },
  responses: {
    200: string
  }
});

const c = xa.trace('/test/:name/:id', xasd);

xa.all(contractDetails, async (req, res) => {});
