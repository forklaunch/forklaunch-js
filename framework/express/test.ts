import { noop } from '@forklaunch/common';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { file, SchemaValidator, string } from '@forklaunch/validator/typebox';
import { NextFunction, Request, Response } from 'express';
import { forklaunchExpress, forklaunchRouter } from './index';
import { get } from './src/handlers/get';
import { post } from './src/handlers/post';

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

const getHandler = get(
  typeboxSchemaValidator,
  '/test',
  {
    name: 'Test',
    summary: 'Test Summary',
    responses: {
      200: {
        contentType: 'application/jsfa',
        schema: {
          type: string
        }
      }
    }
  },
  expressMiddleware,
  async (_req, res) => {
    res.status(200).json({
      type: 'Hello World'
    });
  }
);

const postHandler = post(
  typeboxSchemaValidator,
  '/test',
  {
    name: 'Test',
    summary: 'Test Summary',
    body: {
      multipartForm: {
        test: string,
        f: file('some.txt', 'application/pdf')
      }
    },
    responses: {
      200: {
        contentType: 'text/event-stream',
        event: {
          id: string,
          data: string
        }
      }
    }
  },
  expressMiddleware,
  (req, res) => {
    // res.status(200).send(req.body.f.name);
    // res.status(200).send(req.body.test);
    res.status(200).sseEmitter((write) => {
      for (let i = 0; i < 10; i++) {
        write({
          id: i.toString(),
          data: 'Hello World'
        });
      }
    });
  }
);

forklaunchRouterInstance.get('/test', getHandler);
const m = forklaunchRouterInstance.post('/test', postHandler);
const r = await m.post('/testpath/test', {
  body: {
    multipartForm: {
      test: 'test',
      f: new File(['some.txt'], 'some.txt', {
        type: 'application/pdf'
      })
    }
  }
});
if (r.code === 200) {
  console.log(r.response);
}

console.log(r);

forklaunchApplication.use(forklaunchRouterInstance);

forklaunchApplication.listen(6935, () => {
  console.log('server started on 6935');
});
