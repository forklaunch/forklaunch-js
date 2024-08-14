import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import { parseResponse } from '../middleware';
import {
  ForklaunchRequest,
  ForklaunchResHeaders,
  ForklaunchResponse,
  ForklaunchSendableData,
  ForklaunchStatusResponse,
  ParamsDictionary
} from '../types';

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
    ResBodyMap,
    ForklaunchResHeaders & ResHeaders,
    LocalsObj
  >,
  originalSend: ForklaunchStatusResponse<ForklaunchSendableData>['send'],
  data: ForklaunchSendableData,
  shouldEnrich: boolean
) {
  let parseErrorSent;
  if (shouldEnrich) {
    if (res.statusCode === 404) {
      res.status(404);
      originalSend.call(instance, 'Not Found');
    }

    parseResponse(req, res, (err?: unknown) => {
      if (err) {
        let errorString = (err as Error).message;
        if (res.locals.errorMessage) {
          errorString += `\n------------------\n${res.locals.errorMessage}`;
        }
        res.status(500);
        originalSend.call(instance, errorString);
        parseErrorSent = true;
      }
    });
  }

  if (!parseErrorSent) {
    originalSend.call(instance, data);
  }
}
