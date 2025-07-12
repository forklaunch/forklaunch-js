import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import { describe, expect, it } from 'vitest';
import { generateMcpServer } from '../src/http/mcpGenerator/mcpGenerator';

describe('mcpGenerator tests', () => {
  const schemaValidator = new ZodSchemaValidator();

  const testSchema = {
    id: schemaValidator.string,
    name: schemaValidator.string
  };

  it('should generate MCP server', () => {
    const generatedMcpServer = generateMcpServer(
      schemaValidator,
      'http',
      'localhost',
      8000,
      '1.0.0',
      [
        {
          basePath: '/api' as const,
          routes: [
            {
              basePath: '/test' as const,
              path: '/users/:id',
              method: 'get' as const,
              contractDetails: {
                name: 'GetUser',
                summary: 'Get user by ID',
                params: { id: schemaValidator.string },
                responses: {
                  200: testSchema
                }
              }
            }
          ],
          routers: [],
          fetchMap: {},
          sdk: {}
        }
      ]
    );

    expect(generatedMcpServer).toBeDefined();
    expect(typeof generatedMcpServer).toBe('object');
    expect(generatedMcpServer).toHaveProperty('tool');
  });

  it('should generate MCP server with multiple routes', () => {
    const generatedMcpServer = generateMcpServer(
      schemaValidator,
      'https',
      'example.com',
      443,
      '2.0.0',
      [
        {
          basePath: '/api' as const,
          routes: [
            {
              basePath: '/users' as const,
              path: '/:id',
              method: 'get' as const,
              contractDetails: {
                name: 'GetUser',
                summary: 'Get user by ID',
                params: { id: schemaValidator.string },
                responses: {
                  200: testSchema
                }
              }
            },
            {
              basePath: '/users' as const,
              path: '/',
              method: 'post' as const,
              contractDetails: {
                name: 'CreateUser',
                summary: 'Create a new user',
                body: testSchema,
                responses: {
                  201: testSchema
                }
              }
            }
          ],
          routers: [],
          fetchMap: {},
          sdk: {}
        }
      ]
    );

    expect(generatedMcpServer).toBeDefined();
    expect(typeof generatedMcpServer).toBe('object');
    expect(generatedMcpServer).toHaveProperty('tool');
  });

  it('should generate MCP server with query and headers', () => {
    const generatedMcpServer = generateMcpServer(
      schemaValidator,
      'http',
      'localhost',
      3000,
      '1.0.0',
      [
        {
          basePath: '/api' as const,
          routes: [
            {
              basePath: '/search' as const,
              path: '/users',
              method: 'get' as const,
              contractDetails: {
                name: 'SearchUsers',
                summary: 'Search users with filters',
                query: {
                  q: schemaValidator.string,
                  limit: schemaValidator.number
                },
                requestHeaders: {
                  Authorization: schemaValidator.string
                },
                responses: {
                  200: {
                    users: schemaValidator.array(testSchema)
                  }
                }
              }
            }
          ],
          routers: [],
          fetchMap: {},
          sdk: {}
        }
      ]
    );

    expect(generatedMcpServer).toBeDefined();
    expect(typeof generatedMcpServer).toBe('object');
  });

  it('should throw error for invalid schema validator', () => {
    const invalidValidator = {} as unknown as ZodSchemaValidator;

    expect(() => {
      generateMcpServer(
        invalidValidator,
        'http',
        'localhost',
        8000,
        '1.0.0',
        []
      );
    }).toThrow('Schema validator must be an instance of ZodSchemaValidator');
  });

  it('should generate MCP server with empty routers', () => {
    const generatedMcpServer = generateMcpServer(
      schemaValidator,
      'http',
      'localhost',
      8000,
      '1.0.0',
      []
    );

    expect(generatedMcpServer).toBeDefined();
    expect(typeof generatedMcpServer).toBe('object');
  });

  it('should generate MCP server with nested routers', () => {
    const generatedMcpServer = generateMcpServer(
      schemaValidator,
      'http',
      'localhost',
      8000,
      '1.0.0',
      [
        {
          basePath: '/api' as const,
          routes: [
            {
              basePath: '/health' as const,
              path: '/check',
              method: 'get' as const,
              contractDetails: {
                name: 'HealthCheck',
                summary: 'Check API health',
                responses: {
                  200: { status: schemaValidator.string }
                }
              }
            }
          ],
          routers: [
            {
              basePath: '/v1' as const,
              routes: [
                {
                  basePath: '/users' as const,
                  path: '/:id',
                  method: 'get' as const,
                  contractDetails: {
                    name: 'GetUserV1',
                    summary: 'Get user by ID (v1)',
                    params: { id: schemaValidator.string },
                    responses: {
                      200: testSchema
                    }
                  }
                },
                {
                  basePath: '/posts' as const,
                  path: '/',
                  method: 'post' as const,
                  contractDetails: {
                    name: 'CreatePost',
                    summary: 'Create a new post',
                    body: {
                      title: schemaValidator.string,
                      content: schemaValidator.string,
                      userId: schemaValidator.string
                    },
                    responses: {
                      201: {
                        id: schemaValidator.string,
                        title: schemaValidator.string,
                        content: schemaValidator.string
                      }
                    }
                  }
                }
              ],
              routers: [
                {
                  basePath: '/admin' as const,
                  routes: [
                    {
                      basePath: '/settings' as const,
                      path: '/config',
                      method: 'put' as const,
                      contractDetails: {
                        name: 'UpdateConfig',
                        summary: 'Update admin configuration',
                        body: {
                          key: schemaValidator.string,
                          value: schemaValidator.string
                        },
                        responses: {
                          200: { success: schemaValidator.boolean }
                        }
                      }
                    }
                  ],
                  routers: [],
                  fetchMap: {},
                  sdk: {}
                }
              ],
              fetchMap: {},
              sdk: {}
            }
          ],
          fetchMap: {},
          sdk: {}
        }
      ]
    );

    expect(generatedMcpServer).toBeDefined();
    expect(typeof generatedMcpServer).toBe('object');
    expect(generatedMcpServer).toHaveProperty('tool');
  });
});
