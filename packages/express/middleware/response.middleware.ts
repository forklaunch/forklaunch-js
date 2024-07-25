import { ParamsDictionary, parseResponse } from '@forklaunch/core';
import { AnySchemaValidator } from '@forklaunch/validator';
import cors from 'cors';
import { NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { Request, Response } from '../types/forklaunch.express.types';

/**
 * Middleware to enrich the response transmission by intercepting and parsing responses before they are sent.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {Request<SV>} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export function enrichResponseTransmission<SV extends AnySchemaValidator>(
  req: Request<
    SV,
    ParamsDictionary,
    Record<number, unknown>,
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
  next?: NextFunction
) {
  const originalSend = res.send;
  const originalJson = res.json;

  /**
   * Intercepts the JSON response to include additional processing.
   *
   * @template T - The type of the response data.
   * @param {unknown} data - The data to send in the response.
   * @returns {T} - The result of the original JSON method.
   */
  res.json = function <T>(data?: Record<number, unknown>) {
    res.bodyData = data;
    const result = originalJson.call(this, data);
    return result as T;
  };

  /**
   * Intercepts the send response to include additional processing and error handling.
   *
   * @param {unknown} data - The data to send in the response.
   * @returns {Response} - The result of the original send method.
   */
  res.send = function (data?: Record<number, unknown>) {
    if (!res.bodyData) {
      res.bodyData = data;
    }

    try {
      if (!res.cors) {
        parseResponse(req, res);
      }
      const result = originalSend.call(this, data);
      return result;
    } catch (error: unknown) {
      console.error(error);
      res.status(500);
      originalSend.call(
        this,
        'Internal Server Error: ' + (error as Error).message
      );
      if (next) {
        next(error);
      }
    }
  };

  if (next) {
    next();
  }
}

export async function corsMiddleware<SV extends AnySchemaValidator>(
  req: Request<
    SV,
    ParamsDictionary,
    Record<number, unknown>,
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
  next: NextFunction
) {
  if (req.method === 'OPTIONS') {
    res.cors = true;
  }
  cors()(req, res, next);
}
