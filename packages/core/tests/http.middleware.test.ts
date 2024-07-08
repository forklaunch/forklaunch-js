import { SchemaValidator } from '@forklaunch/validator';
import {
    MockSchemaValidator,
    literal,
    optional,
    union
} from '@forklaunch/validator/tests/mockSchemaValidator';
import { ForklaunchRequest, ForklaunchResponse, HttpContractDetails, parseRequestBody, parseRequestHeaders, parseRequestParams, parseRequestQuery, parseResponse } from '../http';

describe('Http Middleware Tests', () => {
    let contractDetails: HttpContractDetails<MockSchemaValidator>;
    let req: ForklaunchRequest<MockSchemaValidator>;
    let resp: ForklaunchResponse;

    const nextFunction = (err?: unknown) => {
        expect(err).toBeFalsy()
    };

    const testSchema = {
        test: union(['a', optional(literal('test'))] as const)
    };

    beforeAll(() => {
        contractDetails = {
            name: 'Test Contract',
            summary: 'Test Contract Summary',
            responses: {
                200: testSchema
            }
        };

        req = {
            context: {
                correlationId: '123'
            },
            contractDetails,
            schemaValidator: new MockSchemaValidator() as SchemaValidator,
            params: {},
            headers: {},
            body: {},
            query: {}
        };

        resp = {
            bodyData: {},
            statusCode: 200,
            corked: false,
            getHeaders: jest.fn(),
            setHeader: jest.fn(),
            status: jest.fn(),
            send: jest.fn(),
            json: jest.fn(),
            jsonp: jest.fn(),
        };
    });

    test('Validate Request Params', async () => {
        parseRequestParams(req, resp, nextFunction);
    });

    test('Validate Request Headers', async () => {
        parseRequestHeaders(req, resp, nextFunction);
    });

    test('Validate Request Body', async () => {
        parseRequestBody(req, resp, nextFunction);
    });

    test('Validate Request Query Params', async () => {
        parseRequestQuery(req, resp, nextFunction);
    });

    test('Validate Response', async () => {
        parseResponse(req, resp, nextFunction);
    });

    // Not supported yet
    // test('Validate Auth', async () => {
    // });
});
