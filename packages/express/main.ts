import {
  number,
  string,
  TypeboxSchemaValidator
} from '@forklaunch/validator/typebox';
import { forklaunchExpress, forklaunchRouter } from './forklaunch.express';

const typeboxSchemaValidator = new TypeboxSchemaValidator();

const forklaunchApplication = forklaunchExpress(typeboxSchemaValidator);
export const forklaunchRouterInstance = forklaunchRouter(
  '/testpath',
  typeboxSchemaValidator
);

export const dsd = {
  x: forklaunchRouterInstance.get(
    '/test',
    {
      name: 'Test',
      summary: 'Test Summary',
      responses: {
        200: {
          one: string,
          two: string,
          three: number,
          four: string
        },
        500: string
      },
      requestHeaders: {
        'x-test-req': string
      },
      responseHeaders: {
        'x-test': string
      }
    },
    (req, res) => {
      res.status(200).json({
        one: 'Hello',
        two: 'World',
        three: 3,
        four: '221'
      });
    }
  ),

  y: forklaunchRouterInstance.post(
    '/test',
    {
      name: 'Test',
      summary: 'Test Summary',
      body: {
        test: {
          one: string,
          two: string,
          three: number
        }
      },
      responses: {
        200: {
          one: string,
          two: string,
          three: number
        },
        500: number
      }
    },
    (req, res) => {
      res.status(200).json(req.body.test);
    }
  ),

  z: forklaunchRouterInstance.put(
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
  ),

  a: forklaunchRouterInstance.patch(
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
  ),

  m: forklaunchRouterInstance.delete(
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
  )
};

const forklaunchRouterInstance2 = forklaunchRouter(
  '/testpath2',
  typeboxSchemaValidator
);
export const dsd2 = {
  a: forklaunchRouterInstance2.get(
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
  )
};
// type u =
//   typeof forklaunchRouterInstance extends Router<
//     (typeof forklaunchApplication)['schemaValidator'],
//     `/${string}`
//   >
//     ? true
//     : false;
console.log(forklaunchApplication);
forklaunchApplication.use(forklaunchRouterInstance);
forklaunchApplication.use(forklaunchRouterInstance2);

forklaunchApplication.listen(6934, () => {
  console.log('Server started');
});

const x = {};

(x as typeof x & { i: 'a' }).i = 'a';

type ik = typeof x;

async function test() {
  console.log(
    await dsd.x.get('/testpath/test', { headers: { 'x-test-req': 'test' } })
  );
}

test().then(() => console.log('done'));

export type i = typeof dsd;
