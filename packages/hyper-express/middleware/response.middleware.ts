import { parseResponse } from '@forklaunch/core';
import { MiddlewareNext } from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
import cors from 'cors';
import { Request, Response } from '../types/forklaunch.hyperExpress.types';

/**
 * Middleware to enrich the response transmission by intercepting and parsing responses before they are sent.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {Request<SV>} req - The request object.
 * @param {Response} res - The response object.
 * @param {MiddlewareNext} next - The next middleware function.
 */
export function enrichResponseTransmission<SV extends AnySchemaValidator>(
  req: Request<SV>,
  res: Response,
  next: MiddlewareNext
) {
  const originalSend = res.send;
  const originalJson = res.json;

  /**
   * Intercepts the JSON response to include additional processing.
   *
   * @param {unknown} data - The data to send in the response.
   * @returns {boolean} - The result of the original JSON method.
   */
  res.json = function (data: unknown) {
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
      res.corked = res._corked;
    }

    try {
      if (!res.cors && ((res._cork && !res.corked) || !res._cork)) {
        res.getHeaders();
        parseResponse(req, res);
      }
      return originalSend.call(this, data);
    } catch (error: unknown) {
      console.error(error);
      res.status(500);
      originalSend.call(
        this,
        'Internal Server Error: ' + (error as Error).message
      );
      throw error;
    }
  };

  next();
}

export async function corsMiddleware<SV extends AnySchemaValidator>(
  req: Request<SV>,
  res: Response,
  next: MiddlewareNext
) {
  res.cors = true;
  cors()(req, res, next);
  // res.setHeader('vary', 'Origin')
  // res.setHeader('Access-Control-Allow-Origin', '*')
  // res.setHeader('Access-Control-Allow-Headers', '*')
  // // res.setHeader("Content-Type", "application/json");
  // res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE')
  // res.setHeader('Access-Control-Allow-Credentials', "true")

  // if (next) {
  //   next();
  // }
}