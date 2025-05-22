import { isNever, safeStringify } from '@forklaunch/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { OpenAPIObject } from 'openapi3-ts/oas31';
import { ResponseContentParserType } from './types/contentTypes.types';
import { RequestType, ResponseType } from './types/sdk.types';
import { getSdkPath } from './utils/resolvePath';

function mapContentType(contentType: ResponseContentParserType | undefined) {
  switch (contentType) {
    case 'json':
      return 'application/json';
    case 'file':
      return 'application/octet-stream';
    case 'multipartForm':
      return 'multipart/form-data';
    case 'text':
      return 'text/plain';
    case 'stream':
      return 'text/event-stream';
    case undefined:
      return 'application/json';
    default:
      isNever(contentType);
      return 'application/json';
  }
}

/**
 * A class representing the Forklaunch SDK.
 */
export class UniversalSdk {
  constructor(
    private host: string,
    private ajv: Ajv,
    private contentTypeParserMap?: Record<string, ResponseContentParserType>,
    private registryOpenApiJson?: OpenAPIObject
  ) {}

  /**
   * Creates an instance of UniversalSdk.
   *
   * @param {string} host - The host URL for the SDK.
   */
  static async create(
    host: string,
    registryOptions?:
      | {
          path: string;
        }
      | {
          url: string;
        },
    contentTypeParserMap?: Record<string, ResponseContentParserType>
  ) {
    const registry = registryOptions
      ? 'path' in registryOptions
        ? `${host}/${registryOptions.path}`
        : registryOptions.url
      : host;

    const registryOpenApiFetch = await fetch(registry);
    const registryOpenApiJson = JSON.parse(await registryOpenApiFetch.text());

    const ajv = new Ajv({
      coerceTypes: true,
      allErrors: true
    });
    addFormats(ajv);

    return new this(host, ajv, contentTypeParserMap, registryOpenApiJson);
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
                    : String(item)
                );
              }
            } else {
              formData.append(key, String(value));
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
      headers: headers
        ? {
            ...headers,
            ...(defaultContentType != 'multipart/form-data'
              ? { 'Content-Type': body?.contentType ?? defaultContentType }
              : {})
          }
        : undefined,
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

    const contentType =
      response.headers.get('content-type') ||
      response.headers.get('Content-Type');

    const mappedContentType =
      contentType != null
        ? mapContentType(this.contentTypeParserMap?.[contentType])
        : 'application/json';

    let responseBody;

    switch (mappedContentType) {
      case 'application/octet-stream': {
        const fileName = response.headers.get('x-fl-file-name');
        const blob = await response.blob();
        if (fileName == null) {
          responseBody = blob;
        } else {
          responseBody = new File([blob], fileName);
        }
        break;
      }
      case 'multipart/form-data': {
        const parsedFormData: Record<string, unknown> = {};
        (await response.formData()).forEach((value, key) => {
          const schema = responseOpenApi?.schema?.properties?.[key];
          if (value instanceof File) {
            parsedFormData[key] = value;
          } else {
            const isValid = this.ajv.validate(schema, value);
            if (!isValid) {
              throw new Error('Response does not match OpenAPI spec');
            }
            parsedFormData[key] = value;
          }
        });
        responseBody = parsedFormData;
        break;
      }
      case 'text/event-stream': {
        break;
      }
      case 'text/plain':
        responseBody = await response.text();
        break;
      case 'application/json': {
        const json = await response.json();
        const isValidJson = this.ajv.validate(
          responseOpenApi.content?.[mappedContentType],
          json
        );
        if (!isValidJson) {
          throw new Error('Response does not match OpenAPI spec');
        }
        responseBody = json;
        break;
      }
      default:
        isNever(mappedContentType);
        responseBody = await response.text();
        break;
    }

    return {
      code: response.status,
      content: responseBody,
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
