import { safeParse, safeStringify } from '@forklaunch/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { OpenAPIObject } from 'openapi3-ts/oas31';
import { coerceSpecialTypes } from './core/coerceSpecialTypes';
import { mapContentType } from './core/mapContentType';
import { refreshOpenApi } from './core/refreshOpenApi';
import { getSdkPath } from './core/resolvePath';
import { ResponseContentParserType } from './types/contentTypes.types';
import { RegistryOptions, RequestType, ResponseType } from './types/sdk.types';

/**
 * A class representing the Forklaunch SDK.
 */
export class UniversalSdk {
  constructor(
    private host: string,
    private ajv: Ajv,
    private registryOptions: RegistryOptions,
    private contentTypeParserMap:
      | Record<string, ResponseContentParserType>
      | undefined,
    private registryOpenApiJson: OpenAPIObject | undefined,
    private registryOpenApiHash: string | undefined
  ) {}

  /**
   * Creates an instance of UniversalSdk.
   *
   * @param {string} host - The host URL for the SDK.
   */
  static async create(
    host: string,
    registryOptions: RegistryOptions,
    contentTypeParserMap?: Record<string, ResponseContentParserType>
  ) {
    const refreshResult = await refreshOpenApi(host, registryOptions);

    let registryOpenApiJson;
    let registryOpenApiHash;

    if (refreshResult.updateRequired) {
      registryOpenApiJson = refreshResult.registryOpenApiJson;
      registryOpenApiHash = refreshResult.registryOpenApiHash;
    }

    const ajv = new Ajv({
      coerceTypes: true,
      allErrors: true,
      strict: false
    });
    addFormats(ajv);

    return new UniversalSdk(
      host,
      ajv,
      registryOptions,
      contentTypeParserMap,
      registryOpenApiJson,
      registryOpenApiHash
    );
  }

  /**
   * Executes an HTTP request.
   *
   * @param {string} route - The route path for the request.
   * @param {'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} method - The HTTP method.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  private async execute(
    route: string,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    request?: RequestType
  ): Promise<ResponseType> {
    if (!this.host) {
      throw new Error('Host not initialized, please run .create(..) first');
    }

    const refreshResult = await refreshOpenApi(
      this.host,
      this.registryOptions,
      this.registryOpenApiHash
    );

    if (refreshResult.updateRequired) {
      this.registryOpenApiJson = refreshResult.registryOpenApiJson;
      this.registryOpenApiHash = refreshResult.registryOpenApiHash;
    }

    const { params, body, query, headers } = request || {};
    let url = getSdkPath(this.host + route);

    if (params) {
      for (const key in params) {
        url = url.replace(`:${key}`, encodeURIComponent(params[key] as string));
      }
    }

    let defaultContentType = 'application/json';
    let parsedBody;
    if (body != null) {
      if ('schema' in body && body.schema != null) {
        defaultContentType = 'application/json';
        parsedBody = safeStringify(body.schema);
      } else if ('json' in body && body.json != null) {
        defaultContentType = 'application/json';
        parsedBody = safeStringify(body.json);
      } else if ('text' in body && body.text != null) {
        defaultContentType = 'text/plain';
        parsedBody = body.text;
      } else if ('file' in body && body.file != null) {
        defaultContentType = 'application/octet-stream';
        parsedBody = await body.file.text();
      } else if ('multipartForm' in body && body.multipartForm != null) {
        defaultContentType = 'multipart/form-data';
        const formData = new FormData();
        for (const key in body.multipartForm) {
          if (Object.prototype.hasOwnProperty.call(body.multipartForm, key)) {
            const value = body.multipartForm[key];
            if (value instanceof Blob || value instanceof File) {
              formData.append(key, value);
            } else if (Array.isArray(value)) {
              for (const item of value) {
                formData.append(
                  key,
                  item instanceof Blob || item instanceof File
                    ? item
                    : safeStringify(item)
                );
              }
            } else {
              formData.append(key, safeStringify(value));
            }
          }
        }
        parsedBody = formData;
      } else if ('urlEncodedForm' in body && body.urlEncodedForm != null) {
        defaultContentType = 'application/x-www-form-urlencoded';
        parsedBody = new URLSearchParams(
          Object.entries(body.urlEncodedForm).map(([key, value]) => [
            key,
            safeStringify(value)
          ])
        );
      } else {
        parsedBody = safeStringify(body);
      }
    }

    if (query) {
      const queryString = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, safeStringify(value)])
      ).toString();
      url += queryString ? `?${queryString}` : '';
    }

    const response = await fetch(encodeURI(url), {
      method: method.toUpperCase(),
      headers: {
        ...headers,
        ...(defaultContentType != 'multipart/form-data'
          ? { 'Content-Type': body?.contentType ?? defaultContentType }
          : {})
      },
      body: parsedBody
    });

    const responseOpenApi =
      this.registryOpenApiJson?.paths?.[route]?.[
        method.toLowerCase() as typeof method
      ]?.responses?.[response.status];

    if (responseOpenApi == null) {
      throw new Error(
        `Response ${response.status} not found in OpenAPI spec for route ${route}`
      );
    }

    const contentType = (
      response.headers.get('content-type') ||
      response.headers.get('Content-Type')
    )?.split(';')[0];

    const mappedContentType = (
      contentType != null
        ? this.contentTypeParserMap != null &&
          contentType in this.contentTypeParserMap
          ? mapContentType(this.contentTypeParserMap[contentType])
          : contentType
        : 'application/json'
    ).split(';')[0];

    let responseBody;

    switch (mappedContentType) {
      case 'application/octet-stream': {
        const contentDisposition = response.headers.get('content-disposition');
        let fileName: string | null = null;
        if (contentDisposition) {
          const match = /filename\*?=(?:UTF-8''|")?([^;\r\n"]+)/i.exec(
            contentDisposition
          );
          if (match) {
            fileName = decodeURIComponent(match[1].replace(/['"]/g, ''));
          }
        }
        const blob = await response.blob();
        if (fileName == null) {
          responseBody = blob;
        } else {
          responseBody = new File([blob], fileName);
        }
        break;
      }
      case 'text/event-stream': {
        const ajv = this.ajv;
        async function* streamEvents(
          reader: ReadableStreamDefaultReader<Uint8Array>
        ) {
          const decoder = new TextDecoder();
          let buffer = '';
          let lastEventId: string | undefined;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);
              if (line.startsWith('id:')) {
                lastEventId = line.slice(3).trim();
              } else if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                const json = {
                  data: safeParse(data),
                  id: lastEventId
                };
                const isValidJson = ajv.validate(
                  responseOpenApi.content?.[contentType || mappedContentType]
                    .schema,
                  json
                );
                if (!isValidJson) {
                  throw new Error('Response does not match OpenAPI spec');
                }
                yield coerceSpecialTypes(
                  json,
                  responseOpenApi.content?.[contentType || mappedContentType]
                    .schema
                );
              }
            }
          }
          if (buffer.length > 0) {
            let id: string | undefined;
            let data: string | undefined;
            const lines = buffer.trim().split('\n');
            for (const l of lines) {
              const line = l.trim();
              if (line.startsWith('id:')) {
                id = line.slice(3).trim();
              } else if (line.startsWith('data:')) {
                data = line.slice(5).trim();
              }
            }
            if (data !== undefined) {
              const json: Record<string, unknown> = {
                data: safeParse(data),
                id: id ?? lastEventId
              };
              const isValidJson = ajv.validate(
                responseOpenApi.content?.[contentType || mappedContentType]
                  .schema,
                json
              );
              if (!isValidJson) {
                throw new Error('Response does not match OpenAPI spec');
              }
              yield coerceSpecialTypes(
                json,
                responseOpenApi.content?.[contentType || mappedContentType]
                  .schema
              );
            }
          }
        }
        if (!response.body) {
          throw new Error('No response body for event stream');
        }
        responseBody = streamEvents(response.body.getReader());
        break;
      }
      case 'text/plain':
        responseBody = await response.text();
        break;
      case 'application/json':
      default: {
        const json: Record<string, unknown> = await response.json();
        const isValidJson = this.ajv.validate(
          responseOpenApi.content?.[contentType || mappedContentType].schema,
          json
        );
        if (!isValidJson) {
          throw new Error('Response does not match OpenAPI spec');
        }
        responseBody = coerceSpecialTypes(
          json,
          responseOpenApi.content?.[contentType || mappedContentType].schema
        );
        break;
      }
    }

    return {
      code: response.status,
      response: responseBody,
      headers: response.headers
    };
  }

  /**
   * Executes a request with path parameters.
   *
   * @param {string} route - The route path for the request.
   * @param {'GET' | 'DELETE'} method - The HTTP method.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async pathParamRequest(
    route: string,
    method: 'get' | 'delete',
    request?: RequestType
  ) {
    return this.execute(route, method, request);
  }

  /**
   * Executes a request with a body.
   *
   * @param {string} route - The route path for the request.
   * @param {'POST' | 'PUT' | 'PATCH'} method - The HTTP method.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async bodyRequest(
    route: string,
    method: 'post' | 'put' | 'patch',
    request?: RequestType
  ) {
    return this.execute(route, method, request);
  }

  /**
   * Executes a GET request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async get(route: string, request?: RequestType) {
    return this.pathParamRequest(route, 'get', request);
  }

  /**
   * Executes a POST request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async post(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'post', request);
  }

  /**
   * Executes a PUT request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async put(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'put', request);
  }

  /**
   * Executes a PATCH request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async patch(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'patch', request);
  }

  /**
   * Executes a DELETE request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async delete(route: string, request?: RequestType) {
    return this.pathParamRequest(route, 'delete', request);
  }
}
