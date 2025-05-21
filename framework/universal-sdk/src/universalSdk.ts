import { RequestType, ResponseType } from './types/sdkTypes';
import { getSdkPath } from './utils/resolvePath';

/**
 * A class representing the Forklaunch SDK.
 */
export class UniversalSdk {
  /**
   * Creates an instance of UniversalSdk.
   *
   * @param {string} host - The host URL for the SDK.
   */
  constructor(
    private host: string,
    private contentTypeParserMap?: Record<
      string,
      'json' | 'file' | 'text' | 'bytes' | 'arrayBuffer'
    >
  ) {}

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
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    request?: RequestType
  ): Promise<ResponseType> {
    const { params, body, query, headers } = request || {};
    let url = getSdkPath(this.host + route);

    if (params) {
      for (const key in params) {
        url = url.replace(`:${key}`, encodeURIComponent(params[key] as string));
      }
    }

    if (query) {
      const queryString = new URLSearchParams(
        query as Record<string, string>
      ).toString();
      url += queryString ? `?${queryString}` : '';
    }

    let defaultContentType = 'application/json';
    let parsedBody;
    if (body != null) {
      if ('schema' in body && body.schema != null) {
        defaultContentType = 'application/json';
        parsedBody = JSON.stringify(body.schema);
      } else if ('json' in body && body.json != null) {
        defaultContentType = 'application/json';
        parsedBody = JSON.stringify(body.json);
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
        parsedBody = new URLSearchParams(JSON.stringify(body.urlEncodedForm));
      }
    }

    const response = await fetch(encodeURI(url), {
      method,
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

    const contentType =
      response.headers.get('content-type') ||
      response.headers.get('Content-Type');

    let responseBody;

    try {
      // if (this.contentTypeParserMap?.includes(contentType)) {
      switch (contentType) {
        case 'application/json':
          responseBody = await response.json();
          break;
        case 'application/octet-stream':
          responseBody = await response.blob();
          break;
        case 'text/event-stream':
          responseBody = await response.json();
          break;
        case 'text/plain':
          responseBody = await response.text();
          break;
        default:
          responseBody = await response.json();
          break;
      }
    } catch {
      responseBody = await response.text();
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
    method: 'GET' | 'DELETE',
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
    method: 'POST' | 'PUT' | 'PATCH',
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
    return this.pathParamRequest(route, 'GET', request);
  }

  /**
   * Executes a POST request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async post(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'POST', request);
  }

  /**
   * Executes a PUT request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async put(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'PUT', request);
  }

  /**
   * Executes a PATCH request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async patch(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'PATCH', request);
  }

  /**
   * Executes a DELETE request.
   *
   * @param {string} route - The route path for the request.
   * @param {RequestType} [request] - The request object.
   * @returns {Promise<ResponseType>} - The response object.
   */
  async delete(route: string, request?: RequestType) {
    return this.pathParamRequest(route, 'DELETE', request);
  }
}
