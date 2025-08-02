import {
  literal,
  mockSchemaValidator,
  optional,
  union
} from '@forklaunch/validator/tests/mockSchemaValidator';
import { generateOpenApiSpecs } from '../src/http/openApiV3Generator/openApiV3Generator';

describe('openApiV3Generator tests', () => {
  const testSchema = {
    test: union(['a', optional(literal('test'))] as const)
  };

  test('generate openApiV3', async () => {
    const generatedOpenApiSpec = generateOpenApiSpecs(
      mockSchemaValidator,
      'http',
      'localhost',
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
          ],
          routers: [],
          _fetchMap: {},
          sdk: {},
          sdkPaths: {}
        }
      ]
    );

    expect(generatedOpenApiSpec).toEqual({
      openapi: '3.1.0',
      info: { title: '', version: '1.0.0' },
      components: {
        securitySchemes: {}
      },
      tags: [{ name: 'api', description: 'Api Operations' }],
      servers: [{ url: 'http://localhost:8000', description: 'Main Server' }],
      paths: {
        '/api': {
          get: {
            operationId: 'api.testContract',
            tags: ['api'],
            summary: 'Test Contract: Test Contract Summary',
            parameters: [
              { name: 'test', in: 'path', schema: { type: 'string' } },
              { name: 'test', in: 'header', schema: { type: 'string' } },
              { name: 'test', in: 'query', schema: { type: 'string' } }
            ],
            responses: {
              '200': {
                description: 'OK',
                content: { 'application/json': { schema: { type: 'string' } } }
              },
              '400': {
                description: 'Bad Request',
                content: { 'text/plain': { schema: { type: 'string' } } }
              },
              '404': {
                description: 'Not Found',
                content: { 'text/plain': { schema: { type: 'string' } } }
              },
              '500': {
                description: 'Internal Server Error',
                content: { 'text/plain': { schema: { type: 'string' } } }
              }
            },
            requestBody: {
              required: true,
              content: { 'application/json': { schema: { type: 'string' } } }
            }
          }
        }
      }
    });
  });

  test('generate openApiV3 with nested routers', async () => {
    const generatedOpenApiSpec = generateOpenApiSpecs(
      mockSchemaValidator,
      'https',
      'api.example.com',
      443,
      [
        {
          basePath: '/api',
          routes: [],
          routers: [
            {
              basePath: '/v1',
              routes: [
                {
                  basePath: '/users',
                  path: '/:id',
                  method: 'get',
                  contractDetails: {
                    name: 'Get User',
                    summary: 'Get user by ID',
                    params: { id: literal('123') },
                    responses: {
                      200: testSchema
                    }
                  }
                }
              ],
              routers: [],
              _fetchMap: {},
              sdk: {},
              sdkPaths: {}
            }
          ],
          _fetchMap: {},
          sdk: {},
          sdkPaths: {}
        }
      ]
    );

    expect(generatedOpenApiSpec).toMatchObject({
      openapi: '3.1.0',
      info: { title: '', version: '1.0.0' },
      servers: [
        { url: 'https://api.example.com:443', description: 'Main Server' }
      ],
      paths: expect.objectContaining({
        '/api/v1/{id}': expect.objectContaining({
          get: expect.objectContaining({
            tags: ['api/v1'],
            summary: 'Get User: Get user by ID',
            parameters: expect.arrayContaining([
              expect.objectContaining({ name: 'id', in: 'path' })
            ])
          })
        })
      })
    });
  });
});
