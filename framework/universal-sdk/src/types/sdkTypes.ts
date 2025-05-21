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
  body?:
    | Record<string, unknown>
    | ({
        contentType?: string;
      } & (
        | {
            json: Record<string, unknown>;
          }
        | {
            text: string;
          }
        | {
            file: File | Blob;
          }
        | {
            multipartForm: Record<string, unknown>;
          }
        | {
            urlEncodedForm: Record<string, unknown>;
          }
        | {
            schema: Record<string, unknown>;
          }
      ));
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

export interface ResponseType {
  code: number;
  content: unknown;
  headers: Headers;
}

export type ScrubUnsupportedContentTypes<T, U> = {
  [K in keyof T]: T[K] extends U ? T[K] : never;
};
