import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import * as jose from 'jose';
import { v4 } from 'uuid';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResponse
} from '../types/api.types';
import {
  AuthMethod,
  HttpContractDetails,
  PathParamHttpContractDetails,
  StringOnlyObject
} from '../types/primitive.types';

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
  Request extends ForklaunchRequest<SV>,
  Response extends ForklaunchResponse,
  NextFunction extends ForklaunchNextFunction
>(schemaValidator: SV) {
  return (req: Request, res: Response, next?: NextFunction) => {
    req.schemaValidator = schemaValidator as SchemaValidator;

    let correlationId = v4();

    if (req.headers['x-correlation-id']) {
      correlationId = req.headers['x-correlation-id'] as string;
    }

    res.setHeader('x-correlation-id', correlationId);

    req.context = {
      correlationId: correlationId
    };

    if (next) {
      next();
    }
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
  Request extends ForklaunchRequest<SV>,
  Response extends ForklaunchResponse,
  NextFunction extends ForklaunchNextFunction
>(contractDetails: PathParamHttpContractDetails<SV> | HttpContractDetails<SV>) {
  return (req: Request, _res: Response, next?: NextFunction) => {
    req.contractDetails = contractDetails;

    if (next) {
      next();
    }
  };
}

/**
 * Pre-handler function to parse and validate input.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @param {SchemaValidator} schemaValidator - The schema validator.
 * @param {unknown} object - The object to validate.
 * @param {StringOnlyObject<SV>} [schemaInput] - The schema input.
 * @returns {number | void} - Returns 400 if validation fails.
 */
export function preHandlerParse<SV extends AnySchemaValidator>(
  schemaValidator: SchemaValidator,
  object: unknown,
  schemaInput?: StringOnlyObject<SV>
) {
  if (!schemaInput) {
    return;
  }

  const schema = schemaValidator.schemify(schemaInput);
  if (!schemaValidator.validate(schema, object)) {
    return 400;
  }
}

/**
 * Middleware to parse request parameters.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export function parseRequestParams<
  SV extends AnySchemaValidator,
  Request extends ForklaunchRequest<SV>,
  Response extends ForklaunchResponse,
  NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
  const params = req.contractDetails.params;
  if (preHandlerParse(req.schemaValidator, req.params, params) === 400) {
    res.status(400).send('Invalid request parameters.');
    if (next) {
      next(new Error('Invalid request parameters.'));
    }
  }
  if (next) {
    next();
  }
}

/**
 * Middleware to parse request body.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export function parseRequestBody<
  SV extends AnySchemaValidator,
  Request extends ForklaunchRequest<SV>,
  Response extends ForklaunchResponse,
  NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
  if (req.headers['content-type'] === 'application/json') {
    const body = (req.schemaValidator,
    req.contractDetails as HttpContractDetails<SV>).body;
    if (
      preHandlerParse(
        req.schemaValidator,
        req.body,
        body as StringOnlyObject<SV>
      ) === 400
    ) {
      res.status(400).send('Invalid request body.');
      if (next) {
        next(new Error('Invalid request body.'));
      }
    }
  }
  if (next) {
    next();
  }
}

/**
 * Middleware to parse request headers.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export function parseRequestHeaders<
  SV extends AnySchemaValidator,
  Request extends ForklaunchRequest<SV>,
  Response extends ForklaunchResponse,
  NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
  const headers = req.contractDetails.requestHeaders;
  if (preHandlerParse(req.schemaValidator, req.headers, headers) === 400) {
    res.status(400).send('Invalid request headers.');
    if (next) {
      next(new Error('Invalid request headers.'));
    }
  }
  if (next) {
    next();
  }
}

/**
 * Middleware to parse request query.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Request - A type that extends ForklaunchRequest.
 * @template Response - A type that extends ForklaunchResponse.
 * @template NextFunction - A type that extends ForklaunchNextFunction.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} [next] - The next middleware function.
 */
export function parseRequestQuery<
  SV extends AnySchemaValidator,
  Request extends ForklaunchRequest<SV>,
  Response extends ForklaunchResponse,
  NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
  const query = req.contractDetails.query;
  if (preHandlerParse(req.schemaValidator, req.query, query) === 400) {
    res.status(400).send('Invalid request query.');
    if (next) {
      next(new Error('Invalid request query.'));
    }
  }
  if (next) {
    next();
  }
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
  Request extends ForklaunchRequest<SV>,
  Response extends ForklaunchResponse,
  NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
  const auth = req.contractDetails.auth;
  if (auth) {
    const errorAndMessage = await checkAuthorizationToken(
      auth.method,
      req.headers.authorization
    );
    if (Array.isArray(errorAndMessage)) {
      res.status(errorAndMessage[0]).send(errorAndMessage[1]);
      if (next) {
        next(new Error(errorAndMessage[1]));
      }
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
  //       if (next) {
  //         next(new Error(permissionErrorMessage));
  //       }
  //     }
  //   });
  //   roles.forEach((role) => {
  //     if (
  //       !req.contractDetails.auth?.allowedRoles?.has(role) ||
  //       req.contractDetails.auth?.forbiddenRoles?.has(role)
  //     ) {
  //       res.status(403).send(roleErrorMessage);
  //       if (next) {
  //         next(new Error(roleErrorMessage));
  //       }
  //     }
  //   });
  }

  // if (next) {
  //     next();
  // }
}
