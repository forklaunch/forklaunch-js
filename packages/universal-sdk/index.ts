/**
 * Initializes the Forklaunch SDK.
 * 
 * @template TypedController
 * @param {string} host - The host URL for the SDK.
 * @returns {TypedController} - The SDK proxy with methods for HTTP requests.
 */
export const forklaunchSdk = <TypedController>(host: string) => {
    const sdkInternal = new ForklaunchSdk(host);

    const proxyInternal = new Proxy({},{
        get(_target, _prop, _receiver) {
            return new Proxy({}, {
                get(_target, prop, _receiver) {
                    if (typeof prop === 'string') {
                        switch (prop) {
                            case 'get':
                                return sdkInternal.get.bind(sdkInternal);
                            case 'post':
                                return sdkInternal.post.bind(sdkInternal);
                            case 'put':
                                return sdkInternal.put.bind(sdkInternal);
                            case 'patch':
                                return sdkInternal.patch.bind(sdkInternal);
                            case 'delete':
                                return sdkInternal.delete.bind(sdkInternal);
                            default:
                                throw new Error(`Method ${prop} not found`);
                        }
                    }
                    throw new Error(`Method not found`);
                }
            })
        }
    });

    return proxyInternal as TypedController;
}

/**
 * A class representing the Forklaunch SDK.
 */
export class ForklaunchSdk {
    /**
     * Creates an instance of ForklaunchSdk.
     * @param {string} host - The host URL for the SDK.
     */
    constructor(private host: string) {}

    /**
     * Executes an HTTP request.
     * 
     * @param {string} route - The route path for the request.
     * @param {'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} method - The HTTP method.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, unknown>} [request.body] - Request body.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    private async execute(
        route: string,
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        request?: {
            params?: Record<string, string | number | boolean>;
            body?: Record<string, unknown>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        let { params, body, query, headers } = request || {};

        let url = this.host + route;

        if (params) {
          for (const key in params) {
            url = url.replace(`:${key}`, encodeURIComponent(params[key] as string));
          }
        }

        url += new URLSearchParams(query as Record<string, string>).toString();

        if (!headers) {
            headers = {};
        }

        if (body) {
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
        }

        const response = await fetch(encodeURI(url), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        })

        let responseBody;

        const contentType = response.headers.get('content-type');
        console.log(contentType);

        if (contentType && contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }

        return {
          code: response.status,
          response: responseBody,
          headers: response.headers
        }
    }

    /**
     * Executes a request with path parameters.
     * 
     * @param {string} route - The route path for the request.
     * @param {'GET' | 'DELETE'} method - The HTTP method.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    private async pathParamRequest(
        route: string,
        method: 'GET' | 'DELETE',
        request?: {
            params?: Record<string, string | number | boolean>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        return this.execute(route, method, request);
    }

    /**
     * Executes a request with a body.
     * 
     * @param {string} route - The route path for the request.
     * @param {'POST' | 'PUT' | 'PATCH'} method - The HTTP method.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, unknown>} [request.body] - Request body.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    private async bodyRequest(
        route: string,
        method: 'POST' | 'PUT' | 'PATCH',
        request?: {
            params?: Record<string, string | number | boolean>;
            body?: Record<string, unknown>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        return this.execute(route, method, request);
    }

    /**
     * Executes a GET request.
     * 
     * @param {string} route - The route path for the request.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    async get(
        route: string,
        request?: {
            params?: Record<string, string | number | boolean>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        return this.pathParamRequest(route, 'GET', request);
    }
    
    /**
     * Executes a POST request.
     * 
     * @param {string} route - The route path for the request.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, unknown>} [request.body] - Request body.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    async post(
        route: string,
        request?: {
            params?: Record<string, string | number | boolean>;
            body?: Record<string, unknown>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        return this.bodyRequest(route, 'POST', request);
    }

    /**
     * Executes a PUT request.
     * 
     * @param {string} route - The route path for the request.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, unknown>} [request.body] - Request body.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    async put(
        route: string,
        request?: {
            params?: Record<string, string | number | boolean>;
            body?: Record<string, unknown>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        return this.bodyRequest(route, 'PUT', request);
    }

    /**
     * Executes a PATCH request.
     * 
     * @param {string} route - The route path for the request.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, unknown>} [request.body] - Request body.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    async patch(
        route: string,
        request?: {
            params?: Record<string, string | number | boolean>;
            body?: Record<string, unknown>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        return this.bodyRequest(route, 'PATCH', request);
    }

    /**
     * Executes a DELETE request.
     * 
     * @param {string} route - The route path for the request.
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    async delete(
        route: string,
        request?: {
            params?: Record<string, string | number | boolean>;
            query?: Record<string, string | number | boolean>;
            headers?: Record<string, string>;
        }
    ) {
        return this.pathParamRequest(route, 'DELETE', request);
    }
}
