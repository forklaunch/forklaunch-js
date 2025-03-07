import { enrichExpressLikeSend, ParamsDictionary } from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { MiddlewareRequest, MiddlewareResponse } from '../types/express.types';

/**
 * Middleware to enrich the response transmission by intercepting and parsing responses before they are sent.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {Request<SV>} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
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
   * Intercepts the JSON response to include additional processing.
   *
   * @template T - The type of the response data.
   * @param {unknown} data - The data to send in the response.
   * @returns {T} - The result of the original JSON method.
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
   * Intercepts the send response to include additional processing and error handling.
   *
   * @param {unknown} data - The data to send in the response.
   * @returns {Response} - The result of the original send method.
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

  next?.();
}
