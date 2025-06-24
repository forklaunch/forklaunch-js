import { isNever, isRecord, safeStringify } from '@forklaunch/common';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  discriminateBody,
  discriminateResponseBodies
} from '../router/discriminateBody';
import { unpackRouters } from '../router/unpackRouters';
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
  protocol: 'http' | 'https',
  host: string,
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

  const mcpServer = new McpServer({
    name: 'example-server',
    version: version
  });

  unpackRouters<ZodSchemaValidator>(routers).forEach(({ fullPath, router }) => {
    router.routes.forEach((route) => {
      let discriminatedBody:
        | ReturnType<typeof discriminateBody<ZodSchemaValidator>>
        | undefined;
      if ('body' in route.contractDetails) {
        discriminatedBody = discriminateBody(
          schemaValidator,
          route.contractDetails.body
        );
      }

      const inputSchema = {
        ...(discriminatedBody && 'body' in route.contractDetails
          ? {
              ...('contentType' in route.contractDetails.body
                ? { contentType: route.contractDetails.body.contentType }
                : {}),
              body: schemaValidator.schemify(discriminatedBody.schema)
            }
          : {}),
        ...(route.contractDetails.params
          ? { params: schemaValidator.schemify(route.contractDetails.params) }
          : {}),
        ...(route.contractDetails.query
          ? { query: schemaValidator.schemify(route.contractDetails.query) }
          : {}),
        ...(route.contractDetails.requestHeaders
          ? {
              headers: schemaValidator.schemify(
                route.contractDetails.requestHeaders
              )
            }
          : {})
        // TODO: support auth
        //   ...(route.contractDetails.auth
        //     ? { auth: route.contractDetails.auth }
        //     : {})
      };

      mcpServer.tool(
        route.contractDetails.name,
        route.contractDetails.summary,
        inputSchema,
        async (args) => {
          const { contentType, body, params, query, headers } = args as {
            contentType?: string;
            params?: Record<string, string | number | boolean>;
            body?: Record<string, unknown> | string;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
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
                parsedBody = body;
                break;
              }
              case 'multipart': {
                const formData = new FormData();
                if (isRecord(body)) {
                  for (const key in body) {
                    if (
                      typeof body[key] === 'string' ||
                      body[key] instanceof Blob
                    ) {
                      formData.append(key, body[key]);
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

          // let defaultContentType = 'application/json';
          // let parsedBody;
          // let contentType;
          // if (body != null) {
          //   contentType = body.contentType;
          //   if ('schema' in body && body.schema != null) {
          //     defaultContentType = 'application/json';
          //     parsedBody = safeStringify(body.schema);
          //   } else if ('json' in body && body.json != null) {
          //     defaultContentType = 'application/json';
          //     parsedBody = safeStringify(body.json);
          //   } else if ('text' in body && body.text != null) {
          //     defaultContentType = 'text/plain';
          //     parsedBody = body.text;
          //   } else if ('file' in body && body.file != null) {
          //     defaultContentType = 'application/octet-stream';
          //     parsedBody = await body.file('test.txt', 'text/plain');
          //   } else if ('multipartForm' in body && body.multipartForm != null) {
          //     defaultContentType = 'multipart/form-data';
          //     const formData = new FormData();
          //     for (const key in body.multipartForm) {
          //       if (
          //         Object.prototype.hasOwnProperty.call(body.multipartForm, key)
          //       ) {
          //         const multipartForm = body.multipartForm as Record<
          //           string,
          //           unknown
          //         >;
          //         const value = multipartForm[key];

          //         if (value instanceof Blob || value instanceof File) {
          //           formData.append(key, value);
          //         } else if (typeof value === 'function') {
          //           const producedFile = (await value(
          //             'test.txt',
          //             'text/plain'
          //           )) as File;
          //           formData.append(key, producedFile);
          //         } else if (Array.isArray(value)) {
          //           for (const item of value) {
          //             formData.append(
          //               key,
          //               item instanceof Blob || item instanceof File
          //                 ? item
          //                 : typeof item === 'function'
          //                   ? safeStringify(
          //                       await item('test.txt', 'text/plain')
          //                     )
          //                   : safeStringify(item)
          //             );
          //           }
          //         } else {
          //           formData.append(key, safeStringify(value));
          //         }
          //       }
          //     }
          //     parsedBody = formData;
          //   } else if (
          //     'urlEncodedForm' in body &&
          //     body.urlEncodedForm != null
          //   ) {
          //     defaultContentType = 'application/x-www-form-urlencoded';
          //     parsedBody = new URLSearchParams(
          //       Object.entries(body.urlEncodedForm).map(([key, value]) => [
          //         key,
          //         safeStringify(value)
          //       ])
          //     );
          //   } else {
          //     parsedBody = safeStringify(body);
          //   }
          // }

          if (query) {
            const queryString = new URLSearchParams(
              Object.entries(query).map(([key, value]) => [
                key,
                safeStringify(value)
              ])
            ).toString();
            url += queryString ? `?${queryString}` : '';
          }

          const response = await fetch(encodeURI(url), {
            method: route.method.toUpperCase(),
            headers: {
              ...headers,
              ...(discriminatedBody?.contentType != 'multipart/form-data'
                ? {
                    'Content-Type':
                      contentType ?? discriminatedBody?.contentType
                  }
                : {})
            },
            body: parsedBody as BodyInit | null | undefined
          });

          if (response.status >= 300) {
            throw new Error(
              `Error received while proxying request to ${url}: ${await response.text()}`
            );
          }

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
      );
    });
  });

  return mcpServer;
}
