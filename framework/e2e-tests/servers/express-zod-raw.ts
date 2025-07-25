/* eslint-disable @typescript-eslint/no-unused-vars */
import { noop } from '@forklaunch/common';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  forklaunchExpress,
  forklaunchRouter,
  handlers,
  ParsedQs
} from '@forklaunch/express';
import { SchemaValidator } from '@forklaunch/validator/zod';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod/v3';

const zodSchemaValidator = SchemaValidator();
const openTelemetryCollector = new OpenTelemetryCollector('test');

const forklaunchApplication = forklaunchExpress(
  zodSchemaValidator,
  openTelemetryCollector
);

const forklaunchRouterInstance = forklaunchRouter(
  '/testpath',
  zodSchemaValidator,
  openTelemetryCollector
);

const expressMiddleware = (req: Request, res: Response, next: NextFunction) => {
  noop(req, res, next);
  next();
};

const getHandler = handlers.get(
  zodSchemaValidator,
  '/test',
  {
    name: 'Test',
    summary: 'Test Summary',
    responses: {
      200: {
        file: z.string().transform((val: string) => {
          return new Blob([val]);
        })
      }
    }
  },
  expressMiddleware,
  (_req, res) => {
    res.status(200).send(
      new File(
        [
          `Hello World
This is a test file generated by the server.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque ultricies, justo a facilisis posuere, urna massa dictum nisi, eu hendrerit erat est a velit.

Curabitur dignissim, dolor ut consequat tincidunt, sapien velit sodales sem, et placerat nunc enim ornare enim. Vivamus at tristique risus, nec posuere elit. Donec at tristique massa, non maximus enim.

- Item 1: The quick brown fox jumps over the lazy dog.
- Item 2: Etiam eget ligula eu lectus lobortis condimentum.
- Item 3: Mauris accumsan, massa non consectetur hendrerit, erat urna scelerisque sapien, sed cursus augue magna a lorem.

Nulla facilisi. Proin facilisis, justo nec porttitor ullamcorper, nisi nibh dictum ex, eu suscipit erat enim in velit. Pellentesque a consequat nunc. 

Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Suspendisse potenti.

End of file.`
        ],
        'test.txt',
        { type: 'text/plain' }
      )
    );
  }
);

const postHandler = handlers.post(
  zodSchemaValidator,
  '/test',
  {
    name: 'Test',
    summary: 'Test Summary',
    body: {
      f: z.string(),
      m: z.union([z.array(z.number()), z.string()])
    },
    responses: {
      200: {
        contentType: 'text/event-stream',
        event: {
          id: z.string(),
          data: {
            message: z.string()
          }
        }
      }
    }
  },
  expressMiddleware,
  (req, res) => {
    res.status(200).sseEmitter(async function* () {
      try {
        for (let i = 0; i < 100; i++) {
          yield {
            id: i.toString(),
            data: {
              message: `Hello World ${req.body.f}`
            }
          };
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          res.status(500).send('There was an error');
        }
      }
      return;
    });
  }
);

const jsonPatchHandler = handlers.patch(
  zodSchemaValidator,
  '/test',
  {
    name: 'Test',
    summary: 'Test Summary',
    body: {
      f: z.string(),
      h: z.string().uuid()
    },
    responses: {
      200: {
        json: {
          f: {
            g: z.array(z.date())
          }
        }
      }
    }
  },
  expressMiddleware,
  (_req, res) => {
    res.status(200).json({ f: { g: [new Date(), new Date()] } });
  }
);

const multipartHandler = handlers.post(
  zodSchemaValidator,
  '/test/multipart',
  {
    name: 'Test',
    summary: 'Test Summary',
    body: {
      multipartForm: {
        f: z.string(),
        g: z.string().transform((val: string) => {
          return (name: string, type: string) =>
            new File([val], name, {
              type,
              lastModified: Date.now()
            });
        })
      }
    },
    responses: {
      200: {
        text: z.string()
      }
    }
  },
  expressMiddleware,
  async (req, res) => {
    res
      .status(200)
      .send(
        `${req.body.f} ${await req.body.g('test.txt', 'text/plain').text()}`
      );
  }
);

const urlEncodedFormHandler = handlers.post(
  zodSchemaValidator,
  '/test/url-encoded-form',
  {
    name: 'Test',
    summary: 'Test Summary',
    body: {
      urlEncodedForm: {
        f: z.string(),
        h: z.number().optional()
      }
    },
    responses: {
      200: {
        contentType: 'custom/content' as const,
        schema: {
          a: z.string()
        }
      }
    }
  },
  expressMiddleware,
  (req, res) => {
    res.status(200).send({ a: `${req.body.f}` });
  }
);

const getTest = forklaunchRouterInstance.get('/test', getHandler);
const postTest = forklaunchRouterInstance.post('/test', postHandler);
const jsonPatchTest = forklaunchRouterInstance.patch('/test', jsonPatchHandler);
const multipartTest = forklaunchRouterInstance.post(
  '/test/multipart',
  multipartHandler
);
const urlEncodedFormTest = forklaunchRouterInstance.post(
  '/test/url-encoded-form',
  urlEncodedFormHandler
);

forklaunchApplication.use(forklaunchRouterInstance);

forklaunchApplication.listen(6935, () => {
  console.log('server started on 6935');
});

export const liveTests = {
  getTest,
  postTest,
  jsonPatchTest,
  multipartTest,
  urlEncodedFormTest
};

export function start() {
  return forklaunchApplication.listen(6935, () => {
    console.log('server started on 6935');
  });
}

export type SDK = {
  getTest: typeof getTest;
  postTest: typeof postTest;
  jsonPatchTest: typeof jsonPatchTest;
  multipartTest: typeof multipartTest;
  urlEncodedFormTest: typeof urlEncodedFormTest;
};

// Temporary shim for supporting TSGO experimental compiler
type TSGoShim = ParsedQs;
