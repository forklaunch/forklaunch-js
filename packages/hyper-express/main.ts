import { typedHandler } from '@forklaunch/core/http';
import {
  number,
  SchemaValidator,
  string,
  // date,
  uuid
} from '@forklaunch/validator/zod';
import { forklaunchExpress, forklaunchRouter } from './forklaunch.hyperExpress';

const zodSchemaValidator = SchemaValidator();

const forklaunchApplication = forklaunchExpress(zodSchemaValidator);
export const forklaunchRouterInstance = forklaunchRouter(
  '/testpath',
  zodSchemaValidator
);

export const dsd = {
  x: forklaunchRouterInstance.get(
    '/test/:bell/:jkk',
    {
      name: 'Test',
      summary: 'Test Summary',
      params: {
        bell: number,
        jkk: number
      },
      query: {
        hell: number,
        kell: string
      },
      responses: {
        200: {
          one: string,
          two: string,
          three: number
        },
        500: string,
        123: {
          // one: date,
          two: uuid
        }
      },
      requestHeaders: {
        'x-test-req': string,
        p: number
      },
      responseHeaders: {
        'x-test': string,
        p: number
      },
      options: {
        requestValidation: 'error',
        responseValidation: 'error'
      }
    },
    async (req, res) => {
      console.log(req.headers['x-test-req']);
      res.setHeader('x-test', 'test');
      res.setHeader('p', 23);
      req.headers.p;
      res.getHeaders();
      req.query.hell;
      console.log(req.query.hell * 7);
      res.status(200).json({
        one: 'Hello',
        two: 'World',
        three: 3
      });
      // res.status(123).json({
      //   // one: new Date()
      //   two: '0d1f7e7d-0a3c-4b5d-8e1f-3e9b8c7e9b8c'
      // });
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
        500: string
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
  zodSchemaValidator
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
// console.log(forklaunchApplication);
forklaunchApplication.use(forklaunchRouterInstance);
forklaunchApplication.use(forklaunchRouterInstance2);

forklaunchApplication.listen(6934, () => {
  console.log('Server started');
});

const x = {};

(x as typeof x & { i: 'a' }).i = 'a';

// async function test() {
//   console.log(
//     await dsd.x.get('/testpath/test/:hell/:bell/:sell', {
//       params: { hell: 1, bell: 2, sell: 'test' },
//       query: { hell: 1 },
//       headers: { 'x-test-req': 'test' }
//     })
//   );
// }

// test().then(() => {
//   console.log('done');
// });

export type i = typeof dsd;

// import HyperExpress from '@forklaunch/hyper-express-fork';

// const webserver = new HyperExpress.Server();
// const router = new HyperExpress.Router();

// const mw1 = (request: any, response: any, next: () => void) => {
//   console.log('basaa');
//   next();
// };

// // Create GET route to serve 'Hello World'
// router.get(
//   '/',
//   (request, response, next) => {
//     console.log('asaa');
//     next();
//   },
//   mw1,
//   (request, response) => {
//     response.send('Hello World');
//   }
// );

// router.post(
//   '/',
//   (request: any, response: any, next: () => void) => {
//     console.log('asaa');
//     next();
//   },
//   mw1,
//   (request: any, response: { send: (arg0: string) => void }) => {
//     response.send('Hello World');
//   }
// );

// router.put(
//   '/',
//   (request, response, next) => {
//     console.log('asaa');
//     next();
//   },
//   (request, response) => {
//     response.send('Hello World');
//   }
// );

// webserver.use('/test', router);

// //@ts-expect-error
// webserver.routes['get']['/test'].options.middlewares.forEach((middleware) =>
//   console.log(middleware)
// );

// webserver.listen(6934, () => {
//   console.log('Server started');
// });

typedHandler(
  SchemaValidator(),
  'get',
  {
    name: 'Test',
    summary: 'Test Summary',
    responses: {
      200: string
    }
  },
  (req, res) => {
    return res.status(200).send('Hello World');
  }
);
