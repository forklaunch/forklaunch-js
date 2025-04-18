import { enrichExpressLikeSend, ParamsDictionary } from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { MiddlewareRequest, MiddlewareResponse } from '../types/express.types';

/**
 * Middleware to enrich the response transmission by intercepting and parsing responses before they are sent.
 * This middleware enhances Express's response handling by adding additional functionality to the send, json,
 * and setHeader methods.
 *
 * @template SV - A type that extends AnySchemaValidator for schema validation
 * @param {MiddlewareRequest} req - The Express request object with additional type information
 * @param {MiddlewareResponse} res - The Express response object with additional type information
 * @param {NextFunction} [next] - The next middleware function in the chain
 *
 * @example
 * ```typescript
 * app.use(enrichResponseTransmission);
 *
 * app.get('/users', (req, res) => {
 *   // Response will be automatically enriched
 *   res.json({ users: [] });
 * });
 * ```
 */
export function enrichResponseTransmission<SV extends AnySchemaValidator>(
  req: MiddlewareRequest<
    SV,
    ParamsDictionary,
    Record<number, unknown>,
    Record<string, unknown>,
    ParsedQs,
    Record<string, string>,
    Record<string, unknown>
  >,
  res: MiddlewareResponse<
    Record<number, unknown>,
    Record<string, string>,
    Record<string, unknown>
  >,
  next?: NextFunction
) {
  const originalSend = res.send;
  const originalJson = res.json;
  const originalSetHeader = res.setHeader as (
    key: string,
    value: string | string[]
  ) => void;

  /**
   * Intercepts and enhances the JSON response method.
   * Adds additional processing and type validation before sending the response.
   *
   * @template T - The type of the response data, must be a record with numeric keys
   * @param {T} [data] - The data to send in the response
   * @returns {T} - The processed response data
   *
   * @example
   * ```typescript
   * res.json({ id: 1, name: 'John' });
   * ```
   */
  res.json = function <T extends Record<number, unknown>>(data?: T) {
    res.bodyData = data;
    enrichExpressLikeSend<
      SV,
      ParamsDictionary,
      Record<number, unknown>,
      Record<string, unknown>,
      ParsedQs,
      Record<string, string>,
      Record<string, string>,
      Record<string, unknown>
    >(this, req, res, originalJson, data, !res.cors);
    return data;
  };

  /**
   * Intercepts and enhances the send response method.
   * Adds additional processing and error handling before sending the response.
   * If bodyData is not set, uses the provided data as the body.
   *
   * @param {unknown} data - The data to send in the response
   * @returns {Response} - The Express response object
   *
   * @example
   * ```typescript
   * res.send('Hello World');
   * ```
   */
  res.send = function (data) {
    if (!res.bodyData) {
      res.bodyData = data;
    }
    return enrichExpressLikeSend<
      SV,
      ParamsDictionary,
      Record<number, unknown>,
      Record<string, unknown>,
      ParsedQs,
      Record<string, string>,
      Record<string, string>,
      Record<string, unknown>
    >(this, req, res, originalSend, data, !res.cors);
  };

  /**
   * Intercepts and enhances the setHeader method.
   * Automatically stringifies non-string values before setting the header.
   *
   * @param {string} name - The name of the header
   * @param {unknown | unknown[]} value - The header value(s) to set
   * @returns {void}
   *
   * @example
   * ```typescript
   * res.setHeader('X-Custom-Header', { value: 123 }); // Will be stringified
   * res.setHeader('Accept', ['application/json', 'text/plain']);
   * ```
   */
  res.setHeader = function (name: string, value: unknown | unknown[]) {
    let stringifiedValue;
    if (Array.isArray(value)) {
      stringifiedValue = value.map((v) =>
        typeof v !== 'string' ? JSON.stringify(v) : v
      );
    } else {
      stringifiedValue =
        typeof value !== 'string' ? JSON.stringify(value) : value;
    }
    return originalSetHeader.call(this, name, stringifiedValue);
  };

  next?.();
}
