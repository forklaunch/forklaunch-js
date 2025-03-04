import {
  AnySchemaValidator,
  prettyPrintParseErrors,
  SchemaValidator
} from '@forklaunch/validator';
import { ParsedQs } from 'qs';
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
  _res: ForklaunchResponse<ResBodyMap, ResHeaders, LocalsObj>,
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
    req.query = parsedRequest.value.query;
    req.headers = parsedRequest.value.headers;
  }
  if (!parsedRequest.ok) {
    switch (req.contractDetails.options?.requestValidation) {
      default:
      case 'error':
        next?.(
          new Error(prettyPrintParseErrors(parsedRequest.errors, 'Request'))
        );
        break;
      case 'warning':
        console.warn(prettyPrintParseErrors(parsedRequest.errors, 'Request'));
        break;
      case 'none':
        break;
    }
  }

  next?.();
}
