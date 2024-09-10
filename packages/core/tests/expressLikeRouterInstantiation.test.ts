import {
  date,
  number,
  SchemaValidator,
  string
} from '@forklaunch/validator/typebox';
import {
  ExpressLikeRouter,
  ForklaunchExpressLikeRouter,
  typedHandler
} from '../src/http';

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
  {} as ExpressLikeRouter<unknown, unknown>
);
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

xa.all(contractDetails, async (req, res) => {});
