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
  RequestContext,
  createRequestContext,
  enrichRequestDetails,
  parseReqHeaders,
  parseRequestBody,
  parseRequestParams,
  parseRequestQuery,
  parseResponse
} from '../http';

describe('Http Middleware Tests', () => {
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
      context: {} as RequestContext,
      contractDetails: {} as HttpContractDetails<MockSchemaValidator>,
      schemaValidator: {} as SchemaValidator,
      params: testSchema,
      headers: testSchema,
      body: testSchema,
      query: testSchema
    };

    res = {
      bodyData: {},
      statusCode: 200,
      corked: false,
      getHeaders: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn(),
      headersSent: false,
      locals: {}
      // send: jest.fn(),
      // json: jest.fn(),
      // jsonp: jest.fn()
    };
  });

  test('Create Request Context', async () => {
    req.context = {} as RequestContext;
    req.schemaValidator = {} as SchemaValidator;
    createRequestContext(mockSchemaValidator)(req, res, nextFunction);
    expect(req.context.correlationId).not.toBe('123');
    expect(req.schemaValidator).toBe(mockSchemaValidator);
  });

  test('Enrich Request Details', async () => {
    req.contractDetails = {} as HttpContractDetails<MockSchemaValidator>;
    enrichRequestDetails(contractDetails)(req, res, nextFunction);
    expect(req.contractDetails).toEqual(contractDetails);
  });

  test('Validate Request Params', async () => {
    parseRequestParams(req, res, nextFunction);
  });

  test('Validate Request Headers', async () => {
    parseReqHeaders(req, res, nextFunction);
  });

  test('Validate Request Body', async () => {
    parseRequestBody(req, res, nextFunction);
  });

  test('Validate Request Query Params', async () => {
    parseRequestQuery(req, res, nextFunction);
  });

  test('Validate Response', async () => {
    parseResponse(req, res, nextFunction);
  });

  // Not supported yet
  // test('Validate Auth', async () => {
  // });
});
