import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import { parse } from './parse.middleware';

import {
  isAsyncGenerator,
  isNodeJsWriteableStream,
  readableStreamToAsyncIterable
} from '@forklaunch/common';
import { Readable, Transform } from 'stream';
import { discriminateResponseBodies } from '../../router/discriminateBody';
import { logger } from '../../telemetry/pinoLogger';
import { recordMetric } from '../../telemetry/recordMetric';
import {
  ForklaunchRequest,
  ForklaunchResHeaders,
  ForklaunchResponse,
  ForklaunchSendableData,
  ForklaunchStatusResponse
} from '../../types/apiDefinition.types';
import { ParamsDictionary } from '../../types/contractDetails.types';

/**
 * Enhances the Express-like `send` method with additional logic for response handling and validation.
 *
 * This function intercepts the `send` method to provide custom behavior, including response validation
 * through the `parseResponse` middleware. If the response status is 404, it sends a "Not Found" message.
 * If the response validation fails, it sends a parsing error message. Otherwise, it calls the original `send`
 * method with the provided data.
 *
 * @template SV - The type of the schema validator used in the request.
 * @template P - The type of the parameters dictionary used in the request.
 * @template ResBodyMap - A record type mapping status codes to response body types.
 * @template ReqBody - The type of the request body.
 * @template ReqQuery - The type of the parsed query string.
 * @template ReqHeaders - The type of the request headers.
 * @template ResHeaders - The type of the response headers, extended from `ForklaunchResHeaders`.
 * @template LocalsObj - The type of the locals object in the response.
 *
 * @param {unknown} instance - The context (typically `this`) in which the original `send` method is called.
 * @param {ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>} req - The request object, containing the schema validator and other request data.
 * @param {ForklaunchResponse<ResBodyMap, ForklaunchResHeaders & ResHeaders, LocalsObj>} res - The response object, including headers and body data.
 * @param {Function} originalSend - The original `send` method from the response object, to be called after custom logic.
 * @param {string | ArrayBuffer | ArrayBufferView | NodeJS.ReadableStream | null | undefined} data - The data to be sent as the response body.
 * @param {boolean} shouldEnrich - A flag indicating whether the response should be sent immediately.
 *
 * @returns {unknown} The return value of the original `send` method, typically the response itself.
 */
export function enrichExpressLikeSend<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
>(
  instance: unknown,
  req: ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>,
  res: ForklaunchResponse<
    unknown,
    ResBodyMap,
    ForklaunchResHeaders & ResHeaders,
    LocalsObj
  >,
  originalOperation:
    | ForklaunchStatusResponse<ForklaunchSendableData>['json']
    | ForklaunchStatusResponse<ForklaunchSendableData>['jsonp'],
  originalSend: ForklaunchStatusResponse<ForklaunchSendableData>['send'],
  data:
    | ForklaunchSendableData
    | File
    | AsyncGenerator<Record<string, unknown>>
    | null
    | undefined,
  shouldEnrich: boolean
) {
  let errorSent = false;

  if (data == null) {
    originalSend.call(instance, data);
    return;
  }

  if (res.statusCode === 404) {
    res.type('text/plain');
    res.status(404);
    logger('error').error('Not Found');
    originalSend.call(instance, 'Not Found');
    errorSent = true;
  }

  const responseBodies = discriminateResponseBodies(
    req.schemaValidator,
    req.contractDetails.responses
  );

  if (
    responseBodies != null &&
    responseBodies[Number(res.statusCode)] != null
  ) {
    res.type(responseBodies[Number(res.statusCode)].contentType);
  }

  if (data instanceof File) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${data.name}"` as ResHeaders['Content-Disposition']
    );
    if (isNodeJsWriteableStream(res)) {
      Readable.from(readableStreamToAsyncIterable(data.stream())).pipe(
        res as unknown as NodeJS.WritableStream
      );
    } else {
      res.type('text/plain');
      res.status(500);
      originalSend.call(instance, 'Not a NodeJS WritableStream');
      errorSent = true;
    }
  } else if (isAsyncGenerator(data)) {
    let firstPass = true;
    const transformer = new Transform({
      objectMode: true,
      transform(
        chunk: Record<string, unknown>,
        _encoding: unknown,
        callback: (error?: Error | null, data?: unknown) => void
      ) {
        if (firstPass) {
          res.bodyData = chunk;
          parse(req, res, (err?: unknown) => {
            if (err) {
              let errorString = (err as Error).message;
              if (res.locals.errorMessage) {
                errorString += `\n------------------\n${res.locals.errorMessage}`;
              }
              logger('error').error(errorString);
              res.type('text/plain');
              res.status(500);
              originalSend.call(instance, errorString);
              errorSent = true;
              callback(new Error(errorString));
            }
          });
          firstPass = false;
        }
        if (!errorSent) {
          let data = '';
          for (const [key, value] of Object.entries(chunk)) {
            data += `${key}: ${value}\n`;
          }
          data += '\n';
          callback(null, data);
        }
      }
    });
    if (isNodeJsWriteableStream(res)) {
      Readable.from(data).pipe(transformer).pipe(res);
    } else {
      res.type('text/plain');
      res.status(500);
      originalSend.call(instance, 'Not a NodeJS WritableStream');
      errorSent = true;
    }
  } else {
    parse(req, res, (err?: unknown) => {
      if (err) {
        let errorString = (err as Error).message;
        if (res.locals.errorMessage) {
          errorString += `\n------------------\n${res.locals.errorMessage}`;
        }
        logger('error').error(errorString);
        res.type('text/plain');
        res.status(500);
        originalSend.call(instance, errorString);
        errorSent = true;
      }
    });

    if (!errorSent) {
      if (typeof data === 'string') {
        res.type('text/plain');
        originalSend.call(instance, data);
      } else if (!(data instanceof File)) {
        originalOperation.call(instance, data);
      }
    }
  }

  if (shouldEnrich) {
    recordMetric<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ResBodyMap,
      ReqHeaders,
      ForklaunchResHeaders & ResHeaders,
      LocalsObj
    >(req, res);
  }
}
