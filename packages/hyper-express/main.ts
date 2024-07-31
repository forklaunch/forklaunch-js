import {
  number,
  string,
  TypeboxSchemaValidator
} from '@forklaunch/validator/typebox';
import { forklaunchExpress, forklaunchRouter } from './forklaunch.hyperExpress';

const typeboxSchemaValidator = new TypeboxSchemaValidator();

const forklaunchApplication = forklaunchExpress(typeboxSchemaValidator);
export const forklaunchRouterInstance = forklaunchRouter(
  '/testpath',
  typeboxSchemaValidator
);

export const dsd = {
  x: forklaunchRouterInstance.get(
    '/test/:hell/:bell',
    {
      name: 'Test',
      summary: 'Test Summary',
      params: {
        hell: number
      },
      query: {
        hell: number
      },
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
      console.log(req.query.hell * 7);
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
// console.log(forklaunchApplication);
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
    await dsd.x.get('/testpath/test/:hell', {
      params: { hell: 1 },
      query: { hell: 1 },
      headers: { 'x-test-req': 'test' }
    })
  );
}

test().then(() => {
  console.log('done');

  console.log(
    // @ts-expect-error
    forklaunchApplication.internal.routes['get']['/testpath/test/:hell']
  );
  // @ts-expect-error
  forklaunchApplication.internal.routes['get'][
    '/testpath/test/:hell'
    // @ts-expect-error
  ].options.middlewares.forEach((middleware) => console.log(middleware));
});

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
