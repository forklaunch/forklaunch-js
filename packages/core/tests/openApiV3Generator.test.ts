import {
  literal,
  mockSchemaValidator,
  optional,
  union
} from '@forklaunch/validator/tests/mockSchemaValidator';
import { generateSwaggerDocument } from '../src/http/openApiV3Generator/openApiV3Generator';

describe('openApiV3Generator tests', () => {
  const testSchema = {
    test: union(['a', optional(literal('test'))] as const)
  };

  test('generate openApiV3', async () => {
    const generatedOpenApiSpec = generateSwaggerDocument(
      mockSchemaValidator,
      8000,
      [
        {
          basePath: '/api',
          routes: [
            {
              basePath: '/test',
              path: '/',
              method: 'get',
              contractDetails: {
                name: 'Test Contract',
                summary: 'Test Contract Summary',
                body: testSchema,
                params: testSchema,
                requestHeaders: testSchema,
                query: testSchema,
                responses: {
                  200: testSchema
                }
              }
            }
          ]
        }
      ]
    );

    expect(generatedOpenApiSpec).toEqual({
      openapi: '3.1.0',
      info: { title: '', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        }
      },
      tags: [{ name: 'Api', description: 'Api Operations' }],
      servers: [{ url: 'http://localhost:8000' }],
      paths: {
        '/api': {
          get: {
            tags: ['Api'],
            summary: 'Test Contract: Test Contract Summary',
            parameters: [
              { name: 'test', in: 'path' },
              { name: 'test', in: 'header' },
              { name: 'test', in: 'query' }
            ],
            responses: {
              '200': {
                description: 'OK',
                content: { 'application/json': { schema: {} } }
              }
            },
            requestBody: {
              required: true,
              content: { 'application/json': { schema: {} } }
            }
          }
        }
      }
    });
  });
});
