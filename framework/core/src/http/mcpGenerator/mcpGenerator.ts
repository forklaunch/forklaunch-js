import { isNever, isRecord, safeStringify } from '@forklaunch/common';
import { FastMCP } from '@forklaunch/fastmcp-fork';
import { string, ZodSchemaValidator, ZodType } from '@forklaunch/validator/zod';
import { OAuthFlow } from '../oauth/oauthFlow';
import { createOAuthStorage } from '../oauth/oauthStorage';
import { OAuthToken } from '../oauth/types/oauth.types';
import {
  discriminateBody,
  discriminateResponseBodies
} from '../router/discriminateBody';
import { unpackRouters } from '../router/unpackRouters';
import {
  Body,
  HeadersObject,
  Method,
  ParamsObject,
  QueryObject,
  SchemaAuthMethods,
  SessionObject,
  VersionSchema
} from '../types/contractDetails.types';
import { ExpressLikeApplicationOptions } from '../types/expressLikeOptions';
import { ForklaunchRouter } from '../types/router.types';

function generateInputSchema(
  schemaValidator: ZodSchemaValidator,
  body?: Body<ZodSchemaValidator>,
  params?: ParamsObject<ZodSchemaValidator>,
  query?: QueryObject<ZodSchemaValidator>,
  requestHeaders?: HeadersObject<ZodSchemaValidator>,
  auth?: SchemaAuthMethods<
    ZodSchemaValidator,
    ParamsObject<ZodSchemaValidator>,
    Body<ZodSchemaValidator>,
    QueryObject<ZodSchemaValidator>,
    HeadersObject<ZodSchemaValidator>,
    VersionSchema<ZodSchemaValidator, Method>,
    unknown
  >
) {
  let discriminatedBody:
    | ReturnType<typeof discriminateBody<ZodSchemaValidator>>
    | undefined;

  if (body) {
    discriminatedBody = discriminateBody(schemaValidator, body);
  }
  return schemaValidator.schemify({
    ...(discriminatedBody && body
      ? {
          ...('contentType' in body ? { contentType: body.contentType } : {}),
          body: schemaValidator.schemify(discriminatedBody.schema)
        }
      : {}),
    ...(params
      ? {
          params: schemaValidator.schemify(params)
        }
      : {}),
    ...(query
      ? {
          query: schemaValidator.schemify(query)
        }
      : {}),
    ...(requestHeaders
      ? {
          headers: schemaValidator.schemify({
            ...requestHeaders,
            ...(auth
              ? {
                  [auth.headerName ?? 'authorization']: string.startsWith(
                    auth.tokenPrefix ?? ('basic' in auth ? 'Basic ' : 'Bearer ')
                  )
                }
              : {})
          })
        }
      : {}),
    // Always include sessionId as optional parameter for OAuth support
    sessionId: string.optional()
  });
}
/**
 * Generates a ModelContextProtocol server from given routers.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SV} schemaValidator - The schema validator.
 * @param {string | number} port - The port on which the server is running.
 * @param {ForklaunchRouter<SV>[]} routers - The routers to include in the server.
 * @returns {McpServer} - The generated ModelContextProtocol server.
 */
export function generateMcpServer<
  T extends Record<string, unknown> | undefined =
    | Record<string, unknown>
    | undefined
>(
  schemaValidator: ZodSchemaValidator,
  protocol: 'http' | 'https',
  host: string,
  port: number,
  version: `${number}.${number}.${number}`,
  application: ForklaunchRouter<ZodSchemaValidator>,
  appOptions?: ExpressLikeApplicationOptions<
    ZodSchemaValidator,
    SessionObject<ZodSchemaValidator>
  >['mcp'],
  options?: ConstructorParameters<typeof FastMCP<T>>[0],
  contentTypeMap?: Record<string, string>
) {
  if (!(schemaValidator instanceof ZodSchemaValidator)) {
    throw new Error(
      'Schema validator must be an instance of ZodSchemaValidator'
    );
  }

  let oauthFlow: OAuthFlow | undefined;

  if (appOptions && typeof appOptions === 'object' && appOptions.oauth) {
    const oauthConfig = appOptions.oauth;
    const oauthStorage = createOAuthStorage({
      storeToken: oauthConfig.storeToken
        ? (tokenId: string, token: OAuthToken) => oauthConfig.storeToken!(token)
        : undefined,
      retrieveToken: oauthConfig.retrieveToken,
      deleteToken: oauthConfig.deleteToken
    });

    oauthFlow = new OAuthFlow(oauthConfig, oauthStorage);
  }

  const mcpServer = new FastMCP({
    ...options,
    name: options?.name ?? 'mcp-server',
    version
  });

  [
    {
      fullPath: application.basePath === '/' ? '' : application.basePath,
      router: application
    },
    ...unpackRouters<ZodSchemaValidator>(application.routers, [
      application.basePath === '/' ? '' : application.basePath
    ])
  ].forEach(({ fullPath, router }) => {
    router.routes.forEach((route) => {
      if (
        !(
          route.contractDetails.options?.mcp ??
          router.routerOptions?.mcp ??
          appOptions !== false
        )
      ) {
        return;
      }

      const inputSchemas: ZodType[] = [];

      if (route.contractDetails.versions) {
        Object.values(route.contractDetails.versions).forEach((version) => {
          inputSchemas.push(
            generateInputSchema(
              schemaValidator,
              version.body,
              route.contractDetails.params,
              version.query,
              version.requestHeaders,
              route.contractDetails.auth
            )
          );
        });
      } else {
        inputSchemas.push(
          generateInputSchema(
            schemaValidator,
            route.contractDetails.body,
            route.contractDetails.params,
            route.contractDetails.query,
            route.contractDetails.requestHeaders,
            route.contractDetails.auth
          )
        );
      }

      inputSchemas.forEach((inputSchema, index) => {
        mcpServer.addTool({
          name:
            route.contractDetails.name +
            (Object.keys(route.contractDetails.versions ?? {}).length > 1
              ? ` [v${Object.keys(route.contractDetails.versions ?? {})[index]}]`
              : ''),
          description: route.contractDetails.summary,
          parameters: inputSchema,
          execute: async (args) => {
            const { contentType, body, params, query, headers } = args as {
              contentType?: string;
              params?: Record<string, string | number | boolean>;
              body?: Record<string, unknown> | string;
              query?: Record<string, string | number | boolean>;
              headers?: Record<string, unknown>;
            };

            let url = `${protocol}://${host}:${port}${fullPath}${route.path}`;

            if (params) {
              for (const key in params) {
                url = url.replace(
                  `:${key}`,
                  encodeURIComponent(params[key] as string)
                );
              }
            }

            let bodySchema;
            let responsesSchemas;
            if (route.contractDetails.versions) {
              const version = route.contractDetails.versions[index];
              if (version.body && schemaValidator.parse(inputSchema, args).ok) {
                bodySchema = version.body;
                responsesSchemas = version.responses;
              }
            } else {
              bodySchema = route.contractDetails.body;
              responsesSchemas = route.contractDetails.responses;
            }

            const discriminatedBody = bodySchema
              ? discriminateBody(schemaValidator, bodySchema)
              : undefined;

            let parsedBody;
            if (discriminatedBody) {
              switch (discriminatedBody.parserType) {
                case 'json': {
                  parsedBody = safeStringify(body);
                  break;
                }
                case 'text': {
                  parsedBody = body;
                  break;
                }
                case 'file': {
                  parsedBody = Buffer.from(safeStringify(body));
                  break;
                }
                case 'multipart': {
                  const formData = new FormData();
                  if (isRecord(body)) {
                    for (const key in body) {
                      if (typeof body[key] === 'string') {
                        if (
                          schemaValidator.isInstanceOf(
                            body[key],
                            schemaValidator.file
                          )
                        ) {
                          formData.append(
                            key,
                            new Blob([Buffer.from(body[key])])
                          );
                        } else {
                          formData.append(key, body[key]);
                        }
                      } else {
                        throw new Error('Body is not a valid multipart object');
                      }
                    }
                  } else {
                    throw new Error('Body is not a valid multipart object');
                  }
                  parsedBody = formData;
                  break;
                }
                case 'urlEncoded': {
                  if (isRecord(body)) {
                    parsedBody = new URLSearchParams(
                      Object.entries(body).map(([key, value]) => [
                        key,
                        safeStringify(value)
                      ])
                    );
                  } else {
                    throw new Error('Body is not a valid url encoded object');
                  }
                  break;
                }
                default: {
                  isNever(discriminatedBody.parserType);
                  parsedBody = safeStringify(body);
                  break;
                }
              }
            }

            if (query) {
              const queryString = new URLSearchParams(
                Object.entries(query).map(([key, value]) => [
                  key,
                  safeStringify(value)
                ])
              ).toString();
              url += queryString ? `?${queryString}` : '';
            }

            const processedHeaders: Record<string, string> = {};

            if (headers) {
              for (const [key, value] of Object.entries(headers)) {
                if (typeof value === 'string') {
                  processedHeaders[key] = value;
                } else if (value !== null && value !== undefined) {
                  processedHeaders[key] = String(value);
                }
              }
            }

            if (oauthFlow) {
              const sessionId = (args as { sessionId?: string }).sessionId;
              if (sessionId) {
                console.log(
                  `[MCP OAuth] Looking for token with sessionId: ${sessionId}`
                );
                const oauthToken =
                  await oauthFlow.getTokenForSession(sessionId);

                if (oauthToken) {
                  console.log(
                    `[MCP OAuth] Found token, expires at: ${oauthToken.expiresAt}`
                  );
                  processedHeaders['Authorization'] =
                    `Bearer ${oauthToken.accessToken}`;
                } else {
                  console.log(
                    `[MCP OAuth] No token found for sessionId: ${sessionId}`
                  );
                }
              }
            }

            if (discriminatedBody?.contentType !== 'multipart/form-data') {
              processedHeaders['Content-Type'] =
                contentType ??
                discriminatedBody?.contentType ??
                'application/json';
            }

            const response = await fetch(encodeURI(url), {
              method: route.method.toUpperCase(),
              headers: processedHeaders,
              body: parsedBody as BodyInit | null | undefined
            });

            if (response.status >= 300) {
              throw new Error(
                `Error received while proxying request to ${url}: ${await response.text()}`
              );
            }

            if (!responsesSchemas) {
              throw new Error('No responses schemas found');
            }

            const contractContentType = discriminateResponseBodies(
              schemaValidator,
              responsesSchemas
            )[response.status].contentType;
            switch (
              contentTypeMap && contentTypeMap[contractContentType]
                ? contentTypeMap[contractContentType]
                : contractContentType
            ) {
              case 'application/json':
                return {
                  content: [
                    {
                      type: 'text' as const,
                      text: safeStringify(await response.json())
                    }
                  ]
                };
              case 'text/plain':
                return {
                  content: [
                    { type: 'text' as const, text: await response.text() }
                  ]
                };
              case 'application/octet-stream':
                return {
                  content: [
                    {
                      type: 'resource' as const,
                      resource: {
                        uri: response.url,
                        blob: Buffer.from(
                          await (await response.blob()).arrayBuffer()
                        ).toString('base64')
                      }
                    }
                  ]
                };
              case 'text/event-stream':
                return {
                  content: [
                    { type: 'text' as const, text: await response.text() }
                  ]
                };
              default:
                return {
                  content: [
                    { type: 'text' as const, text: await response.text() }
                  ]
                };
            }
          }
        });
      });
    });
  });

  if (oauthFlow) {
    mcpServer.addTool({
      name: 'OAuth Authorization',
      description:
        'Initiate OAuth authorization flow. Requires a unique sessionId to isolate user sessions.',
      parameters: schemaValidator.schemify({
        sessionId: string
      }),
      execute: async (args) => {
        const { sessionId } = args as { sessionId?: string };
        if (!sessionId) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: sessionId is required for OAuth authorization'
              }
            ],
            isError: true
          };
        }
        const authUrl = await oauthFlow!.initiateAuthFlow(sessionId);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Please visit this URL to authorize: ${authUrl}`
            }
          ]
        };
      }
    });

    mcpServer.addTool({
      name: 'OAuth Token Exchange',
      description:
        'Exchange authorization code for access token. Use the same sessionId from OAuth Authorization.',
      parameters: schemaValidator.schemify({
        code: string,
        state: string,
        sessionId: string
      }),
      execute: async (args) => {
        const { code, state, sessionId } = args as {
          code: string;
          state: string;
          sessionId?: string;
        };
        if (!sessionId) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: sessionId is required for token exchange'
              }
            ],
            isError: true
          };
        }
        try {
          const token = await oauthFlow!.exchangeCodeForToken(
            code,
            state,
            sessionId
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `OAuth token obtained and stored successfully!

Session ID: ${sessionId}
Token Type: ${token.tokenType}
Expires At: ${token.expiresAt.toISOString()}
Expires In: ${token.expiresIn} seconds
Scope: ${token.scope || 'Not specified'}
Has Refresh Token: ${token.refreshToken ? 'Yes' : 'No'}

✓ Token securely stored and ready to use
✓ Use this sessionId (${sessionId}) when calling protected endpoints
✓ The MCP server will automatically inject the token in API requests`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `OAuth token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
            isError: true
          };
        }
      }
    });

    mcpServer.addTool({
      name: 'OAuth Token Validation',
      description: 'Validate OAuth token',
      parameters: schemaValidator.schemify({
        tokenId: string.optional(),
        sessionId: string.optional()
      }),
      execute: async (args) => {
        const { tokenId, sessionId } = args as {
          tokenId?: string;
          sessionId?: string;
        };
        try {
          let validationResult;
          if (tokenId) {
            validationResult = await oauthFlow!.validateToken(tokenId);
          } else if (sessionId) {
            const token = await oauthFlow!.getTokenForSession(sessionId);
            if (token) {
              validationResult = { isValid: true, token };
            } else {
              validationResult = {
                isValid: false,
                error: 'No token found for session'
              };
            }
          } else {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Either tokenId or sessionId must be provided'
                }
              ],
              isError: true
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: validationResult.isValid
                  ? `Token is valid. Expires at: ${validationResult.token?.expiresAt.toISOString()}`
                  : `Token validation failed: ${validationResult.error}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
            isError: true
          };
        }
      }
    });

    mcpServer.addTool({
      name: 'OAuth Token Revocation',
      description: 'Revoke OAuth token and clear session',
      parameters: schemaValidator.schemify({
        sessionId: string
      }),
      execute: async (args) => {
        const { sessionId } = args as { sessionId: string };
        try {
          await oauthFlow!.revokeToken(sessionId);
          return {
            content: [
              {
                type: 'text' as const,
                text: 'OAuth token revoked successfully'
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Token revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
            isError: true
          };
        }
      }
    });
  }

  return mcpServer;
}
