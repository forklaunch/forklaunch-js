/**
 * Initializes the Forklaunch SDK.
 *
 * @template TypedController
 * @param {string} host - The host URL for the SDK.
 * @returns {TypedController} - The SDK proxy with methods for HTTP requests.
 */
export const forklaunchSdk = (host) => {
    const sdkInternal = new ForklaunchSdk(host);
    const proxyInternal = new Proxy({}, {
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
            });
        }
    });
    return proxyInternal;
};
/**
 * A class representing the Forklaunch SDK.
 */
class ForklaunchSdk {
    host;
    /**
     * Creates an instance of ForklaunchSdk.
     * @param {string} host - The host URL for the SDK.
     */
    constructor(host) {
        this.host = host;
    }
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
    async execute(route, method, request) {
        let { params, body, query, headers } = request || {};
        let url = this.host + route;
        if (params) {
            for (const key in params) {
                url = url.replace(`:${key}`, encodeURIComponent(params[key]));
            }
        }
        url += new URLSearchParams(query).toString();
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
        });
        let responseBody;
        const contentType = response.headers.get('content-type');
        console.log(contentType);
        if (contentType && contentType.includes('application/json')) {
            responseBody = await response.json();
        }
        else {
            responseBody = await response.text();
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
     * @param {Object} [request] - The request object.
     * @param {Record<string, string | number | boolean>} [request.params] - URL parameters.
     * @param {Record<string, string | number | boolean>} [request.query] - Query parameters.
     * @param {Record<string, string>} [request.headers] - Request headers.
     * @returns {Promise<{ code: number, response: any, headers: Headers }>} - The response object.
     */
    async pathParamRequest(route, method, request) {
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
    async bodyRequest(route, method, request) {
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
    async get(route, request) {
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
    async post(route, request) {
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
    async put(route, request) {
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
    async patch(route, request) {
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
    async delete(route, request) {
        return this.pathParamRequest(route, 'DELETE', request);
    }
}
