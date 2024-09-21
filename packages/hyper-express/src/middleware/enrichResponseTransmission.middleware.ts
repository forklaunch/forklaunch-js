import {
  enrichExpressLikeSend,
  ForklaunchNextFunction,
  ParamsDictionary
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import { Request, Response } from '../types/hyperExpress.types';

/**
 * Middleware to enrich the response transmission by intercepting and parsing responses before they are sent.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {Request<SV>} req - The request object.
 * @param {Response} res - The response object.
 * @param {MiddlewareNext} next - The next middleware function.
 */
export function enrichResponseTransmission<SV extends AnySchemaValidator>(
  req: Request<
    SV,
    ParamsDictionary,
    Record<string, unknown>,
    ParsedQs,
    Record<string, string>,
    Record<string, unknown>
  >,
  res: Response<
    Record<number, unknown>,
    Record<string, string>,
    Record<string, unknown>
  >,
  next: ForklaunchNextFunction
) {
  console.debug('[MIDDLEWARE] enrichResponseTransmission');
  const originalSend = res.send;
  const originalJson = res.json;
  const originalSetHeader = res.setHeader as (
    key: string,
    value: string | string[]
  ) => void;

  /**
   * Intercepts the JSON response to include additional processing.
   *
   * @param {unknown} data - The data to send in the response.
   * @returns {boolean} - The result of the original JSON method.
   */
  res.json = function <T extends Record<string, unknown>>(data: T) {
    res.bodyData = data;
    const result = originalJson.call(this, data);
    return result as boolean;
  };

  /**
   * Intercepts the send response to include additional processing and error handling.
   *
   * @param {unknown} data - The data to send in the response.
   * @returns {Response} - The result of the original send method.
   */
  res.send = function (data) {
    if (!res.bodyData) {
      res.bodyData = data;
      res.statusCode = res._status_code;
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
    >(
      this,
      req,
      res,
      originalSend,
      data,
      !res.cors && ((res._cork && !res._corked) || !res._cork)
    );
  };

  /**
   * Intercepts the setHeader method to stringify the value before setting the header.
   *
   * @param {string}
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
  next();
}
