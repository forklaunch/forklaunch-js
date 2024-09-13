import { AnySchemaValidator } from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResponse
} from '../../types/apiDefinition.types';
import {
  AuthMethods,
  ParamsDictionary
} from '../../types/contractDetails.types';

/**
 * Checks the authorization token for validity.
 *
 * @param {AuthMethod} [authorizationMethod] - The method of authorization.
 * @param {string} [authorizationToken] - The authorization string.
 * @returns {Promise<[401 | 403, string] | string | undefined>} - The result of the authorization check.
 */
async function checkAuthorizationToken<
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
>(
  authorizationMethod: AuthMethods<SV, Path, P, ReqBody, ReqQuery, ReqHeaders>,
  authorizationToken?: string
): Promise<readonly [401 | 403, string] | string | undefined> {
  if (authorizationToken == null) {
    return [401, 'No Authorization token provided.'];
  }
  const invalidAuthorizationTokenFormat = [401, 'Invalid Authorization token format.'] as const;
    if (authorizationMethod.method === 'jwt') {
      if (!authorizationToken.startsWith('Bearer ')) {
        return invalidAuthorizationTokenFormat;
      }
    }
    else if (authorizationMethod.method === 'basic') {
      if (!authorizationToken.startsWith('Basic ')) {
        return invalidAuthorizationTokenFormat;
      }
    }
    else if (authorizationMethod.method === 'other') {
      if (!authorizationToken.startsWith(`${authorizationMethod.tokenPrefix} `)) {
        return invalidAuthorizationTokenFormat;
      }
    }
    
    return [401, 'Invalid Authorization method.'];
  }

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
  Path extends `/${string}`,
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
    const errorAndMessage = await checkAuthorizationToken<
      SV,
      Path,
      P,
  ReqBody,
  ReqQuery,
  ReqHeaders

    >(
      auth,
      req.headers.authorization
    );
    if (Array.isArray(errorAndMessage)) {
      res.status(errorAndMessage[0]).send(errorAndMessage[1]);
      next?.(new Error(errorAndMessage[1]));
    }

    try {
        const decodedJwt = await jose.jwtVerify(
          authorizationToken.split(' ')[1],
          new TextEncoder().encode(
            process.env.JWT_SECRET || 'your-256-bit-secret'
          )
        );
        return decodedJwt.payload.iss;
      } catch (error) {
        console.error(error);
        return [403, 'Invalid Authorization token.'];
      }
    // TODO: Implement role and permission checking
      const permissionSlugs = mapPermissions(
        auth.method,
        req.headers.authorization
      );
      const roles = mapRoles(auth.method, req.headers.authorization);

      const permissionErrorMessage =
        'User does not have sufficient permissions to perform action.';
      const roleErrorMessage =
        'User does not have correct role to perform action.';

      permissionSlugs.forEach((permissionSlug) => {
        if (
          !req.contractDetails.auth?.allowedSlugs?.has(permissionSlug) ||
          req.contractDetails.auth?.forbiddenSlugs?.has(permissionSlug)
        ) {
          res.status(403).send(permissionErrorMessage);
          next?.(new Error(permissionErrorMessage));
          }
        }
      });
      roles.forEach((role) => {
        if (
          !req.contractDetails.auth?.allowedRoles?.has(role) ||
          req.contractDetails.auth?.forbiddenRoles?.has(role)
        ) {
          res.status(403).send(roleErrorMessage);
          next?.(new Error(roleErrorMessage));
        }
      });
  }

  next?.();
}
