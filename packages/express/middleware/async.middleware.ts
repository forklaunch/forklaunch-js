import { ParamsDictionary } from '@forklaunch/core';
import { AnySchemaValidator } from '@forklaunch/validator';
import { RequestHandler } from 'express';
import { ParsedQs } from 'qs';

/**
 * Wraps an asynchronous middleware function to handle errors and pass them to the next middleware.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template P - A type for request parameters, defaulting to ParamsDictionary.
 * @template ResBodyMap - A type for the response body, defaulting to unknown.
 * @template ReqBody - A type for the request body, defaulting to unknown.
 * @template ReqQuery - A type for the request query, defaulting to ParsedQs.
 * @template LocalsObj - A type for local variables, defaulting to an empty object.
 * @template StatusCode - A type for the status code, defaulting to number.
 * @param {RequestHandler} fn - The asynchronous middleware function to wrap.
 * @returns {RequestHandler} - The wrapped middleware function.
 */
export function asyncMiddleware<
  SV extends AnySchemaValidator,
  P = ParamsDictionary,
  ResBodyMap = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, unknown> = Record<string, unknown>,
  StatusCode extends number = number
>(fn: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    await Promise.resolve(fn(req, res, next)).catch(next);
    if (next) {
      next();
    }
  };
}
