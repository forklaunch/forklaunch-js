import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import cors from 'cors';
import * as jose from 'jose';
import { ParsedQs } from 'qs';
import { v4 } from 'uuid';
import { isResponseShape } from '../guards/isResponseShape';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResHeaders,
  ForklaunchResponse,
  ForklaunchSchemaMiddlewareHandler
} from '../types/apiDefinition.types';
import {
  AuthMethod,
  Body,
  ContractDetails,
  HeadersObject,
  Method,
  ParamsDictionary,
  ParamsObject,
  QueryObject,
  ResponseCompiledSchema,
  ResponsesObject
} from '../types/contractDetails.types';

/**
 * Cors middleware handler
 *
 * @param req - Express-like request object
 * @param res - Express-like response object
 * @param next - Express-like next function
 */
export function corsMiddleware<
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
  console.debug('[MIDDLEWARE] cors started');
  if (req.method === 'OPTIONS') {
    res.cors = true;
  }
  cors()(req, res, next ?? (() => {}));
}

/**
 * Middleware to create and add a request context.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {SV} schemaValidator - The schema validator.
 * @returns {Function} - Middleware function to create request context.
 */
export function createRequestContext<
  SV extends AnySchemaValidator,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  schemaValidator: SV
): ForklaunchSchemaMiddlewareHandler<
  SV,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  LocalsObj
> {
  return (req, res, next?) => {
    console.debug('[MIDDLEWARE] createRequestContext started');
    req.schemaValidator = schemaValidator as SchemaValidator;

    let correlationId = v4();

    if (req.headers['x-correlation-id']) {
      correlationId = req.headers['x-correlation-id'];
    }

    res.setHeader('x-correlation-id', correlationId);

    req.context = {
      correlationId: correlationId
    };

    next?.();
  };
}

/**
 * Middleware to enrich the request details with contract details.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {PathParamHttpContractDetails<SV> | HttpContractDetails<SV>} contractDetails - The contract details.
 * @returns {Function} - Middleware function to enrich request details.
 */
export function enrichRequestDetails<
  SV extends AnySchemaValidator,
  ContractMethod extends Method,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  contractDetails: ContractDetails<
    SV,
    ContractMethod,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders
  >,
  requestSchema: unknown,
  responseSchemas: ResponseCompiledSchema
): ForklaunchSchemaMiddlewareHandler<
  SV,
  P,
  ResBodyMap,
  ReqBody,
  ReqQuery,
  ReqHeaders,
  ResHeaders,
  LocalsObj
> {
  return (req, res, next?) => {
    console.debug('[MIDDLEWARE] enrichRequestDetails started');
    req.contractDetails = contractDetails;
    req.requestSchema = requestSchema;
    res.responseSchemas = responseSchemas;
    next?.();
  };
}

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
export function parseRequest<
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
  console.debug('[MIDDLEWARE] parseRequest started');
  const request = {
    params: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body
  };

  const parsedRequest = req.schemaValidator.parse(req.requestSchema, request);

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
        next?.(new Error(`Invalid request: ${parsedRequest.error}`));
        break;
      case 'warning':
        console.warn(`Invalid request: ${parsedRequest.error}`);
        break;
      case 'none':
        break;
    }
  }

  next?.();
}

/**
 * Checks the authorization token for validity.
 *
 * @param {AuthMethod} [authorizationMethod] - The method of authorization.
 * @param {string} [authorizationString] - The authorization string.
 * @returns {Promise<[401 | 403, string] | string | undefined>} - The result of the authorization check.
 */
async function checkAuthorizationToken(
  authorizationMethod?: AuthMethod,
  authorizationString?: string
): Promise<[401 | 403, string] | string | undefined> {
  if (!authorizationString) {
    return [401, 'No Authorization token provided.'];
  }
  switch (authorizationMethod) {
    case 'jwt': {
      if (!authorizationString.startsWith('Bearer ')) {
        return [401, 'Invalid Authorization token format.'];
      }
      try {
        const decodedJwt = await jose.jwtVerify(
          authorizationString.split(' ')[1],
          new TextEncoder().encode(
            process.env.JWT_SECRET || 'your-256-bit-secret'
          )
        );
        return decodedJwt.payload.iss;
      } catch (error) {
        console.error(error);
        return [403, 'Invalid Authorization token.'];
      }
    }
    default:
      return [401, 'Invalid Authorization method.'];
  }
}

/**
 * Maps roles from authorization.
 *
 * @param {AuthMethod} [authorizationType] - The method of authorization.
 * @param {string} [authorizationToken] - The authorization token.
 * @returns {string[]} - The mapped roles.
 */
// function mapRoles(
//   authorizationType?: AuthMethod,
//   authorizationToken?: string
// ): string[] {
//   return [];
// }

/**
 * Maps permissions from authorization.
 *
 * @param {AuthMethod} [authorizationType] - The method of authorization.
 * @param {string} [authorizationToken] - The authorization token.
 * @returns {string[]} - The mapped permissions.
 */
// function mapPermissions(
//   authorizationType?: AuthMethod,
//   authorizationToken?: string
// ): string[] {
//   return [];
// }

/**
 * Middleware to parse request authorization.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export async function parseRequestAuth<
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
  res: ForklaunchResponse<ResBodyMap, ResHeaders, LocalsObj>,
  next?: ForklaunchNextFunction
) {
  const auth = req.contractDetails.auth;
  if (auth) {
    const errorAndMessage = await checkAuthorizationToken(
      auth.method,
      req.headers.authorization
    );
    if (Array.isArray(errorAndMessage)) {
      res.status(errorAndMessage[0]).send(errorAndMessage[1]);
      next?.(new Error(errorAndMessage[1]));
    }

    // TODO: Implement role and permission checking
    //   const permissionSlugs = mapPermissions(
    //     auth.method,
    //     req.headers.authorization
    //   );
    //   const roles = mapRoles(auth.method, req.headers.authorization);

    //   const permissionErrorMessage =
    //     'User does not have sufficient permissions to perform action.';
    //   const roleErrorMessage =
    //     'User does not have correct role to perform action.';

    //   permissionSlugs.forEach((permissionSlug) => {
    //     if (
    //       !req.contractDetails.auth?.allowedSlugs?.has(permissionSlug) ||
    //       req.contractDetails.auth?.forbiddenSlugs?.has(permissionSlug)
    //     ) {
    //       res.status(403).send(permissionErrorMessage);
    //       next?.(new Error(permissionErrorMessage));
    //       }
    //     }
    //   });
    //   roles.forEach((role) => {
    //     if (
    //       !req.contractDetails.auth?.allowedRoles?.has(role) ||
    //       req.contractDetails.auth?.forbiddenRoles?.has(role)
    //     ) {
    //       res.status(403).send(roleErrorMessage);
    //       next?.(new Error(roleErrorMessage));
    //     }
    //   });
  }

  // next?.();
}
