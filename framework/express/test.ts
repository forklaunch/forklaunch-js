import { noop } from '@forklaunch/common';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { SchemaValidator, string } from '@forklaunch/validator/zod';
import { NextFunction, Request, Response } from 'express';
import { forklaunchExpress, forklaunchRouter } from './index';

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

const expressMiddleware = (req: Request, res: Response, next: NextFunction) => {
  noop(req, res, next);
  next();
};

forklaunchRouterInstance.get(
  '/test',
  {
    name: 'Test',
    summary: 'Test Summary',
    responses: {
      200: {
        contentType: 'application/jsfa',
        parserType: 'text',
        schema: string
      }
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
    res.status(200).json(req.body.test);
  }
);

forklaunchApplication.use(forklaunchRouterInstance);

forklaunchApplication.listen(6935, () => {
  console.log('server started on 6935');
});
