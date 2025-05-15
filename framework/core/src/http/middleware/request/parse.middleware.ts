import {
  AnySchemaValidator,
  prettyPrintParseErrors,
  SchemaValidator
} from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import { hasSend } from '../../guards/hasSend';
import { isResponseShape } from '../../guards/isResponseShape';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResponse
} from '../../types/apiDefinition.types';
import { ParamsDictionary } from '../../types/contractDetails.types';

/**
 * Pre-handler function to parse and validate input.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export function parse<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
>(
  req: ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>,
  res: ForklaunchResponse<unknown, ResBodyMap, ResHeaders, LocalsObj>,
  next?: ForklaunchNextFunction
) {
  const request = {
    params: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body
  };

  const parsedRequest = (req.schemaValidator as SchemaValidator).parse(
    req.requestSchema,
    request
  );

  if (
    parsedRequest.ok &&
    isResponseShape<P, ReqHeaders, ReqQuery, ReqBody>(parsedRequest.value)
  ) {
    req.body = parsedRequest.value.body;
    req.params = parsedRequest.value.params;
    Object.defineProperty(req, 'query', {
      value: parsedRequest.value.query,
      writable: false,
      enumerable: true,
      configurable: false
    });
    req.headers = parsedRequest.value.headers;
  }
  if (!parsedRequest.ok) {
    switch (req.contractDetails.options?.requestValidation) {
      default:
      case 'error':
        res.type('application/json');
        res.status(400);
        if (hasSend(res)) {
          res.send(
            `${prettyPrintParseErrors(
              parsedRequest.errors,
              'Request'
            )}\n\nCorrelation id: ${
              req.context.correlationId ?? 'No correlation ID'
            }`
          );
        } else {
          next?.(new Error('Request is not sendable.'));
        }
        return;
      case 'warning':
        req.openTelemetryCollector.warn(
          prettyPrintParseErrors(parsedRequest.errors, 'Request')
        );
        break;
      case 'none':
        break;
    }
  }

  next?.();
}
