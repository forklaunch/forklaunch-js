import { TypeboxSchemaValidator, string } from '@forklaunch/validator/typebox';
import forklaunchExpress, { forklaunchRouter } from './forklaunch.hyperExpress';

const typeboxSchemaValidator = new TypeboxSchemaValidator();

const forklaunchApplication = forklaunchExpress(typeboxSchemaValidator);
const forklaunchRouterInstance = forklaunchRouter(
  '/testpath',
  typeboxSchemaValidator
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

console.log(forklaunchApplication.internal.routes);

forklaunchApplication.listen(6934, () => {
  console.log('Server started');
});
