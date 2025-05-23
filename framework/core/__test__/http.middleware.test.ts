import { IdiomaticSchema } from '@forklaunch/validator';
import {
  MockSchemaValidator,
  literal,
  mockSchemaValidator,
  optional,
  union
} from '@forklaunch/validator/tests/mockSchemaValidator';
import {
  ForklaunchRequest,
  ForklaunchResponse,
  HttpContractDetails,
  MetricsDefinition,
  OpenTelemetryCollector,
  ParamsDictionary,
  RequestContext
} from '../src/http';
import { cors } from '../src/http/middleware/request/cors.middleware';
import { createContext } from '../src/http/middleware/request/createContext.middleware';
import { enrichDetails } from '../src/http/middleware/request/enrichDetails.middleware';
import { parse as parseRequest } from '../src/http/middleware/request/parse.middleware';
import { parse as parseResponse } from '../src/http/middleware/response/parse.middleware';

describe('http middleware tests', () => {
  let contractDetails: HttpContractDetails<MockSchemaValidator>;
  let req: ForklaunchRequest<
    MockSchemaValidator,
    ParamsDictionary,
    Record<string, IdiomaticSchema<MockSchemaValidator>>,
    Record<string, string>,
    Record<string, string>
  >;
  let res: ForklaunchResponse<
    unknown,
    Record<number, unknown>,
    Record<string, string>,
    Record<string, unknown>
  >;

  const nextFunction = (err?: unknown) => {
    expect(err).toBeFalsy();
  };

  const testSchema = {
    test: union(['a', optional(literal('test'))] as const)
  };

  beforeEach(() => {
    contractDetails = {
      name: 'Test Contract',
      summary: 'Test Contract Summary',
      body: testSchema,
      params: testSchema,
      requestHeaders: testSchema,
      query: testSchema,
      responses: {
        200: testSchema
      }
    };

    req = {
      path: '/test',
      originalPath: '/test',
      method: 'POST',
      context: {} as RequestContext,
      contractDetails: {} as HttpContractDetails<MockSchemaValidator>,
      schemaValidator: {} as MockSchemaValidator,
      params: testSchema,
      headers: testSchema,
      body: testSchema,
      query: testSchema,
      requestSchema: {
        params: testSchema,
        query: testSchema,
        headers: testSchema,
        body: testSchema
      },
      openTelemetryCollector: {} as OpenTelemetryCollector<MetricsDefinition>
    };

    res = {
      bodyData: testSchema,
      statusCode: 200,
      metricRecorded: false,
      getHeaders: () => ({ 'x-correlation-id': '123' }),
      setHeader: () => {},
      status: () => ({
        json: () => true,
        jsonp: () => true,
        send: () => true,
        sseEmitter: () => Promise.resolve()
      }),
      end: () => {},
      type: () => {},
      on: () => res,
      headersSent: false,
      locals: {},
      cors: true,
      responseSchemas: {
        headers: {
          'x-correlation-id': '123'
        },
        responses: {
          200: testSchema
        }
      },
      sent: false
    };
  });

  test('cors middleware', async () => {
    cors(req, res, nextFunction);
    expect(res.cors).toBe(true);
  });

  test('create request context', async () => {
    req.context = {} as RequestContext;
    req.schemaValidator = {} as MockSchemaValidator;
    createContext(mockSchemaValidator)(req, res, nextFunction);
    expect(req.context.correlationId).not.toBe('123');
    expect(req.schemaValidator).toBe(mockSchemaValidator);
  });

  test('request enrich details', async () => {
    req.contractDetails = {} as HttpContractDetails<MockSchemaValidator>;
    enrichDetails(
      '/test',
      contractDetails,
      testSchema,
      {
        headers: { 'x-correlation-id': '123' },
        responses: {
          200: testSchema
        }
      },
      new OpenTelemetryCollector('test')
    )(req, res, nextFunction);
    expect(req.contractDetails).toEqual(contractDetails);
  });

  test('parse request', async () => {
    createContext(mockSchemaValidator)(req, res, nextFunction);
    parseRequest(req, res, nextFunction);
  });

  test('parse response', async () => {
    createContext(mockSchemaValidator)(req, res, nextFunction);
    parseResponse(req, res, nextFunction);
  });

  // TODO: enrich transmission response test

  // Not supported yet
  // test('Validate Auth', async () => {
  // });
});
