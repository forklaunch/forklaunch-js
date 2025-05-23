/**
 * @typedef {Object} RequestType
 * @property {Record<string, string | number | boolean>} [params] - URL parameters.
 * @property {Record<string, unknown>} [body] - Request body.
 * @property {Record<string, string | number | boolean>} [query] - Query parameters.
 * @property {Record<string, string>} [headers] - Request headers.
 */

import { OpenAPIObject } from 'openapi3-ts/oas31';

/**
 * @typedef {Object} ResponseType
 * @property {number} code - The HTTP response code.
 * @property {any} response - The response body.
 * @property {Headers} headers - The response headers.
 */
export interface RequestType {
  params?: Record<string, string | number | boolean>;
  body?:
    | {
        [K: string]: unknown;
        contentType?: never;
        json?: never;
        text?: never;
        file?: never;
        multipartForm?: never;
        urlEncodedForm?: never;
        schema?: never;
      }
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
  response: unknown;
  headers: Headers;
}

export type RegistryOptions =
  | {
      path: string;
      static?: boolean;
    }
  | {
      url: string;
      static?: boolean;
    }
  | {
      raw: OpenAPIObject;
    };
