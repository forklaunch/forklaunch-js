import { safeStringify } from '@forklaunch/common';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { discriminateResponseBodies } from '../router/discriminateBody';
import { ForklaunchRouter } from '../types/router.types';

/**
 * Generates a ModelContextProtocol server from given routers.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SV} schemaValidator - The schema validator.
 * @param {string | number} port - The port on which the server is running.
 * @param {ForklaunchRouter<SV>[]} routers - The routers to include in the server.
 * @returns {McpServer} - The generated ModelContextProtocol server.
 */
export function generateMcpServer(
  schemaValidator: ZodSchemaValidator,
  port: number,
  version: string,
  routers: ForklaunchRouter<ZodSchemaValidator>[],
  contentTypeMap?: Record<string, string>
) {
  if (!(schemaValidator instanceof ZodSchemaValidator)) {
    throw new Error(
      'Schema validator must be an instance of ZodSchemaValidator'
    );
  }

  const mcpServer = new McpServer(
    {
      name: 'example-server',
      version: version
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  routers.flat(Infinity).forEach((router) => {
    router.routes.forEach((route) => {
      const inputSchema = {
        ...('body' in route.contractDetails && route.contractDetails.body
          ? { body: schemaValidator.schemify(route.contractDetails.body) }
          : {}),
        ...(route.contractDetails.params
          ? { params: schemaValidator.schemify(route.contractDetails.params) }
          : {}),
        ...(route.contractDetails.query
          ? { query: schemaValidator.schemify(route.contractDetails.query) }
          : {}),
        ...(route.contractDetails.requestHeaders
          ? {
              requestHeaders: schemaValidator.schemify(
                route.contractDetails.requestHeaders
              )
            }
          : {})
        // TODO: support auth
        //   ...(route.contractDetails.auth
        //     ? { auth: route.contractDetails.auth }
        //     : {})
      };

      mcpServer.registerTool(
        route.contractDetails.name,
        {
          description: route.contractDetails.summary,
          inputSchema: inputSchema
        },
        async ({ body, params, query, requestHeaders }) => {
          console.log(
            `${Object.entries(params as Record<string, string>).reduce(
              (acc: string, [param, value]: [string, string]) =>
                acc.replace(`:${param}`, value),
              `http://localhost:${port}${router.basePath}${route.path}`
            )}${
              query
                ? `?${Object.entries(query)
                    .map(
                      ([param, value]: [string, unknown]) => `${param}=${value}`
                    )
                    .join('&')}`
                : ''
            }`,
            {
              method: route.method,
              body: body,
              headers: requestHeaders
            }
          );

          const response = await fetch(
            `${Object.entries(params as Record<string, string>).reduce(
              (acc: string, [param, value]: [string, string]) =>
                acc.replace(`:${param}`, value),
              `http://localhost:${port}${router.basePath}${route.path}`
            )}${
              query
                ? `?${Object.entries(query)
                    .map(
                      ([param, value]: [string, unknown]) => `${param}=${value}`
                    )
                    .join('&')}`
                : ''
            }`,
            {
              method: route.method,
              body: body as BodyInit,
              headers: requestHeaders as HeadersInit
            }
          );

          const contractContentType = discriminateResponseBodies(
            schemaValidator,
            route.contractDetails.responses
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
                      blob: await (await response.blob()).text()
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
      );
      //   mcpServer.tool(
      //     route.contractDetails.name,
      //     {},
      //     async ({ body, params, query, requestHeaders }) => {
      //       console.log(
      //         `${Object.entries(params).reduce(
      //           (acc: string, [param, value]: [string, unknown]) =>
      //             acc.replace(`:${param}`, value as string),
      //           `http://localhost:${port}${router.basePath}${route.path}`
      //         )}${
      //           query
      //             ? `?${Object.entries(query)
      //                 .map(
      //                   ([param, value]: [string, unknown]) => `${param}=${value}`
      //                 )
      //                 .join('&')}`
      //             : ''
      //         }`,
      //         {
      //           method: route.method,
      //           body: body,
      //           headers: requestHeaders
      //         }
      //       );

      //       const response = await fetch(
      //         `${Object.entries(params).reduce(
      //           (acc: string, [param, value]: [string, unknown]) =>
      //             acc.replace(`:${param}`, value as string),
      //           `http://localhost:${port}${router.basePath}${route.path}`
      //         )}${
      //           query
      //             ? `?${Object.entries(query)
      //                 .map(
      //                   ([param, value]: [string, unknown]) => `${param}=${value}`
      //                 )
      //                 .join('&')}`
      //             : ''
      //         }`,
      //         {
      //           method: route.method,
      //           body: body,
      //           headers: requestHeaders
      //         }
      //       );

      //       const contractContentType = discriminateResponseBodies(
      //         schemaValidator,
      //         route.contractDetails.responses
      //       )[response.status].contentType;
      //       switch (
      //         contentTypeMap && contentTypeMap[contractContentType]
      //           ? contentTypeMap[contractContentType]
      //           : contractContentType
      //       ) {
      //         case 'application/json':
      //           return {
      //             content: [
      //               {
      //                 type: 'text' as const,
      //                 text: safeStringify(await response.json())
      //               }
      //             ]
      //           };
      //         case 'text/plain':
      //           return {
      //             content: [
      //               { type: 'text' as const, text: await response.text() }
      //             ]
      //           };
      //         case 'application/octet-stream':
      //           return {
      //             content: [
      //               {
      //                 type: 'resource' as const,
      //                 resource: {
      //                   uri: response.url,
      //                   blob: await (await response.blob()).text()
      //                 }
      //               }
      //             ]
      //           };
      //         case 'text/event-stream':
      //           return {
      //             content: [
      //               { type: 'text' as const, text: await response.text() }
      //             ]
      //           };
      //         default:
      //           return {
      //             content: [
      //               { type: 'text' as const, text: await response.text() }
      //             ]
      //           };
      //       }
      //     }
      //   );
    });
  });

  return mcpServer;
}
