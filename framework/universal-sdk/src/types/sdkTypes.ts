/**
 * @typedef {Object} RequestType
 * @property {Record<string, string | number | boolean>} [params] - URL parameters.
 * @property {Record<string, unknown>} [body] - Request body.
 * @property {Record<string, string | number | boolean>} [query] - Query parameters.
 * @property {Record<string, string>} [headers] - Request headers.
 */

/**
 * @typedef {Object} ResponseType
 * @property {number} code - The HTTP response code.
 * @property {any} response - The response body.
 * @property {Headers} headers - The response headers.
 */
export interface RequestType {
  params?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

export interface ResponseType {
  code: number;
  content: unknown;
  headers: Headers;
}
