import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResHeaders,
  ForklaunchResponse
} from '../types/api.types';
import {
  HttpContractDetails,
  ParamsDictionary
} from '../types/primitive.types';

/**
 * Checks if any validation is required for the given contract details.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {HttpContractDetails<SV>} contractDetails - The contract details.
 * @returns {boolean} - True if any validation is required, otherwise false.
 */
function checkAnyValidation<SV extends AnySchemaValidator>(
  contractDetails: HttpContractDetails<SV>
) {
  return (
    contractDetails.body ||
    contractDetails.params ||
    contractDetails.requestHeaders ||
    contractDetails.query
  );
}

/**
 * Middleware to parse and validate the response.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export function parseResponse<
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
  res: ForklaunchResponse<
    ResBodyMap,
    ForklaunchResHeaders & ResHeaders,
    LocalsObj
  >,
  next?: ForklaunchNextFunction
) {
  if (req.contractDetails.responseHeaders) {
    const schema = req.schemaValidator.schemify(
      req.contractDetails.responseHeaders
    );
    req.schemaValidator.validate(schema, res.getHeaders());
  }

  if (
    res.statusCode === 500 ||
    (checkAnyValidation(req.contractDetails) && res.statusCode === 400) ||
    (req.contractDetails.auth &&
      (res.statusCode === 401 || res.statusCode === 403))
  ) {
    req.schemaValidator.validate(req.schemaValidator.string, res.bodyData);
    return;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      req.contractDetails.responses,
      res.statusCode
    )
  ) {
    const schema = req.schemaValidator.schemify(
      req.contractDetails.responses[res.statusCode]
    );
    req.schemaValidator.validate(schema, res.bodyData);
  } else {
    if (next) {
      next(
        new Error(`Response code ${res.statusCode} not defined in contract.`)
      );
    }
  }

  if (next) {
    next();
  }
}
