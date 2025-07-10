import { openApiCompliantPath, toPrettyCamelCase } from '@forklaunch/common';
import {
  AnySchemaValidator,
  IdiomaticSchema,
  SchemaValidator
} from '@forklaunch/validator';
import {
  ContentObject,
  OpenAPIObject,
  OperationObject,
  PathObject,
  ResponsesObject,
  SecuritySchemeObject,
  TagObject
} from 'openapi3-ts/oas31';
import HTTPStatuses from '../httpStatusCodes';
import {
  discriminateBody,
  discriminateResponseBodies
} from '../router/discriminateBody';
import { unpackRouters } from '../router/unpackRouters';
import { ForklaunchRouter } from '../types/router.types';

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} str - The string to transform.
 * @returns {string} - The transformed string with the first letter capitalized.
 */
function toUpperCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Transforms a base path by ensuring it starts with a slash and capitalizing the first letter.
 *
 * @param {string} basePath - The base path to transform.
 * @returns {string} - The transformed base path.
 */
function transformBasePath(basePath: string) {
  if (basePath.startsWith('/')) {
    return basePath.slice(1);
  }
  return `/${basePath}`;
}

/**
 * Creates a Swagger document.
 *
 * @param {string | number} port - The port on which the server is running.
 * @param {TagObject[]} tags - The tags for the Swagger document.
 * @param {PathObject} paths - The paths for the Swagger document.
 * @returns {OpenAPIObject} - The Swagger document.
 */
function generateOpenApiDocument(
  protocol: 'http' | 'https',
  host: string,
  port: string | number,
  tags: TagObject[],
  paths: PathObject,
  securitySchemes: Record<string, SecuritySchemeObject>,
  otherServers?: {
    url: string;
    description: string;
  }[]
): OpenAPIObject {
  return {
    openapi: '3.1.0',
    info: {
      title: process.env.API_TITLE || '',
      version: process.env.VERSION || '1.0.0'
    },
    components: {
      securitySchemes
    },
    tags,
    servers: [
      {
        url: `${protocol}://${host}:${port}`,
        description: 'Main Server'
      },
      ...(otherServers || [])
    ],
    paths
  };
}

/**
 * Resolves the content object for a given schema.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SV} schemaValidator - The schema validator.
 * @param {IdiomaticSchema<SV>} body - The schema body.
 * @returns {ContentObject} - The resolved content object.
 */
function contentResolver<SV extends AnySchemaValidator>(
  schemaValidator: SV,
  body: IdiomaticSchema<SV>,
  contentType?: string
): ContentObject {
  const bodySpec = (schemaValidator as SchemaValidator).openapi(body);
  return contentType != null
    ? {
        [contentType]: {
          schema: bodySpec
        }
      }
    : body === schemaValidator.string
      ? {
          'text/plain': {
            schema: bodySpec
          }
        }
      : {
          'application/json': {
            schema: bodySpec
          }
        };
}

/**
 * Generates a Swagger document from given routers.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SV} schemaValidator - The schema validator.
 * @param {string | number} port - The port on which the server is running.
 * @param {ForklaunchRouter<SV>[]} routers - The routers to include in the Swagger document.
 * @returns {OpenAPIObject} - The generated Swagger document.
 */
export function generateSwaggerDocument<SV extends AnySchemaValidator>(
  schemaValidator: SV,
  protocol: 'http' | 'https',
  host: string,
  port: string | number,
  routers: ForklaunchRouter<SV>[],
  otherServers?: {
    url: string;
    description: string;
  }[]
): OpenAPIObject {
  const tags: TagObject[] = [];
  const paths: PathObject = {};
  const securitySchemes: Record<string, SecuritySchemeObject> = {};

  unpackRouters<SV>(routers).forEach(({ fullPath, router, sdkPath }) => {
    const controllerName = transformBasePath(fullPath);
    tags.push({
      name: controllerName,
      description: `${toUpperCase(controllerName)} Operations`
    });
    router.routes.forEach((route) => {
      const openApiPath = openApiCompliantPath(
        `${fullPath}${route.path === '/' ? '' : route.path}`
      );
      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }
      const { name, summary, query, requestHeaders } = route.contractDetails;

      const responses: ResponsesObject = {};

      const discriminatedResponseBodiesResult = discriminateResponseBodies(
        schemaValidator,
        route.contractDetails.responses
      );

      for (const key in discriminatedResponseBodiesResult) {
        responses[key] = {
          description: HTTPStatuses[key],
          content: contentResolver(
            schemaValidator,
            discriminatedResponseBodiesResult[key].schema,
            discriminatedResponseBodiesResult[key].contentType
          )
        };
      }

      const commonErrors = [400, 404, 500];
      for (const error of commonErrors) {
        if (!(error in responses)) {
          responses[error] = {
            description: HTTPStatuses[error],
            content: contentResolver(schemaValidator, schemaValidator.string)
          };
        }
      }

      const operationObject: OperationObject = {
        tags: [controllerName],
        summary: `${name}: ${summary}`,
        parameters: [],
        responses,
        operationId: `${sdkPath}.${toPrettyCamelCase(name)}`
      };
      if (route.contractDetails.params) {
        for (const key in route.contractDetails.params) {
          operationObject.parameters?.push({
            name: key,
            in: 'path',
            schema: (schemaValidator as SchemaValidator).openapi(
              route.contractDetails.params[key]
            )
          });
        }
      }

      const discriminatedBodyResult =
        'body' in route.contractDetails
          ? discriminateBody(schemaValidator, route.contractDetails.body)
          : null;

      if (discriminatedBodyResult) {
        operationObject.requestBody = {
          required: true,
          content: contentResolver(
            schemaValidator,
            discriminatedBodyResult.schema,
            discriminatedBodyResult.contentType
          )
        };
      }

      if (requestHeaders) {
        for (const key in requestHeaders) {
          operationObject.parameters?.push({
            name: key,
            in: 'header',
            schema: (schemaValidator as SchemaValidator).openapi(
              requestHeaders[key]
            )
          });
        }
      }

      if (query) {
        for (const key in query) {
          operationObject.parameters?.push({
            name: key,
            in: 'query',
            schema: (schemaValidator as SchemaValidator).openapi(query[key])
          });
        }
      }

      if (route.contractDetails.auth) {
        responses[401] = {
          description: HTTPStatuses[401],
          content: contentResolver(schemaValidator, schemaValidator.string)
        };
        responses[403] = {
          description: HTTPStatuses[403],
          content: contentResolver(schemaValidator, schemaValidator.string)
        };

        if ('basic' in route.contractDetails.auth) {
          operationObject.security = [
            {
              basic: Array.from(
                'allowedPermissions' in route.contractDetails.auth
                  ? route.contractDetails.auth.allowedPermissions?.values() ||
                      []
                  : []
              )
            }
          ];

          securitySchemes['basic'] = {
            type: 'http',
            scheme: 'basic'
          };
        } else if (route.contractDetails.auth) {
          operationObject.security = [
            {
              [route.contractDetails.auth.headerName !== 'Authorization'
                ? 'bearer'
                : 'apiKey']: Array.from(
                'allowedPermissions' in route.contractDetails.auth
                  ? route.contractDetails.auth.allowedPermissions?.values() ||
                      []
                  : []
              )
            }
          ];

          if (
            route.contractDetails.auth.headerName &&
            route.contractDetails.auth.headerName !== 'Authorization'
          ) {
            securitySchemes[route.contractDetails.auth.headerName] = {
              type: 'apiKey',
              in: 'header',
              name: route.contractDetails.auth.headerName
            };
          } else {
            securitySchemes['Authorization'] = {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            };
          }
        }
      }

      if (route.method !== 'middleware') {
        paths[openApiPath][route.method] = operationObject;
      }
    });
  });

  return generateOpenApiDocument(
    protocol,
    host,
    port,
    tags,
    paths,
    securitySchemes,
    otherServers
  );
}
