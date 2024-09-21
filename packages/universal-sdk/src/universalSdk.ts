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
  constructor(private host: string) {}

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

    const response = await fetch(encodeURI(url), {
      method,
      headers: headers
        ? { ...headers, 'Content-Type': 'application/json' }
        : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    const contentType = response.headers.get('content-type');
    const responseBody =
      contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    return {
      code: response.status,
      content: responseBody,
      headers: response.headers
    };
  }

  async pathParamRequest(
    route: string,
    method: 'GET' | 'DELETE',
    request?: RequestType
  ) {
    return this.execute(route, method, request);
  }

  async bodyRequest(
    route: string,
    method: 'POST' | 'PUT' | 'PATCH',
    request?: RequestType
  ) {
    return this.execute(route, method, request);
  }

  async get(route: string, request?: RequestType) {
    return this.pathParamRequest(route, 'GET', request);
  }

  async post(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'POST', request);
  }

  async put(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'PUT', request);
  }

  async patch(route: string, request?: RequestType) {
    return this.bodyRequest(route, 'PATCH', request);
  }

  async delete(route: string, request?: RequestType) {
    return this.pathParamRequest(route, 'DELETE', request);
  }
}
