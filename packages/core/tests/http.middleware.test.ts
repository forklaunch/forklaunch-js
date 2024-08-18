import { IdiomaticSchema, SchemaValidator } from '@forklaunch/validator';
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

  beforeAll(() => {
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
      method: 'POST',
      context: {} as RequestContext,
      contractDetails: {} as HttpContractDetails<MockSchemaValidator>,
      schemaValidator: {} as SchemaValidator,
      params: testSchema,
      headers: testSchema,
      body: testSchema,
      query: testSchema,
      requestSchema: testSchema
    };

    res = {
      bodyData: {},
      statusCode: 200,
      getHeaders: () => ({ 'x-correlation-id': '123' }),
      setHeader: () => {},
      status: () => ({
        json: () => true,
        jsonp: () => true,
        send: () => {}
      }),
      end: () => {},
      headersSent: false,
      locals: {},
      cors: true,
      responseSchemas: {
        headers: {
          testSchema
        },
        responses: {
          200: testSchema
        }
      }
    };
  });

  test('cors middleware', async () => {
    cors(req, res, nextFunction);
    expect(res.cors).toBe(true);
  });

  test('create request context', async () => {
    req.context = {} as RequestContext;
    req.schemaValidator = {} as SchemaValidator;
    createContext(mockSchemaValidator)(req, res, nextFunction);
    expect(req.context.correlationId).not.toBe('123');
    expect(req.schemaValidator).toBe(mockSchemaValidator);
  });

  test('request enrich details', async () => {
    req.contractDetails = {} as HttpContractDetails<MockSchemaValidator>;
    enrichDetails(contractDetails, testSchema, {
      headers: testSchema,
      responses: {
        200: testSchema
      }
    })(req, res, nextFunction);
    expect(req.contractDetails).toEqual(contractDetails);
  });

  test('parse request', async () => {
    parseRequest(req, res, nextFunction);
  });

  test('parse response', async () => {
    parseResponse(req, res, nextFunction);
  });

  // TODO: enrich transmission response test

  // Not supported yet
  // test('Validate Auth', async () => {
  // });
});
