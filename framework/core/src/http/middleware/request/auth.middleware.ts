import { AnySchemaValidator } from '@forklaunch/validator';
import { jwtVerify } from 'jose';
import { ParsedQs } from 'qs';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResponse,
  MapParamsSchema,
  MapReqBodySchema,
  MapReqHeadersSchema,
  MapReqQuerySchema,
  MapResBodyMapSchema,
  MapResHeadersSchema,
  ResolvedForklaunchRequest
} from '../../types/apiDefinition.types';
import {
  AuthMethods,
  Body,
  HeadersObject,
  ParamsDictionary,
  ParamsObject,
  QueryObject,
  ResponsesObject
} from '../../types/contractDetails.types';

const invalidAuthorizationTokenFormat = [
  401,
  'Invalid Authorization token format.'
] as const;
const invalidAuthorizationSubject = [
  403,
  'Invalid Authorization subject.'
] as const;
const invalidAuthorizationTokenPermissions = [
  403,
  'Invalid Authorization permissions.'
] as const;
const invalidAuthorizationTokenRoles = [
  403,
  'Invalid Authorization roles.'
] as const;
const invalidAuthorizationToken = [
  403,
  'Invalid Authorization token.'
] as const;
const invalidAuthorizationLogin = [
  403,
  'Invalid Authorization login.'
] as const;

/**
 * Checks the authorization token for validity.
 *
 * @param {AuthMethod} [authorizationMethod] - The method of authorization.
 * @param {string} [authorizationToken] - The authorization string.
 * @returns {Promise<[401 | 403, string] | string | undefined>} - The result of the authorization check.
 */
async function checkAuthorizationToken<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  BaseRequest
>(
  authorizationMethod: AuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    BaseRequest
  >,
  authorizationToken?: string,
  req?: ResolvedForklaunchRequest<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    BaseRequest
  >
): Promise<readonly [401 | 403 | 500, string] | undefined> {
  if (authorizationToken == null) {
    return [401, 'No Authorization token provided.'];
  }

  const [tokenPrefix, token] = authorizationToken.split(' ');

  let resourceId;

  switch (authorizationMethod.method) {
    case 'jwt': {
      if (tokenPrefix !== 'Bearer') {
        return invalidAuthorizationTokenFormat;
      }

      try {
        const decodedJwt = await jwtVerify(
          token,
          new TextEncoder().encode(
            // TODO: Check this at application startup if there is any route with jwt checking
            process.env.JWT_SECRET
          )
        );

        if (!decodedJwt.payload.sub) {
          return invalidAuthorizationSubject;
        }

        resourceId = decodedJwt.payload.sub;
      } catch (error) {
        (
          req as ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>
        ).openTelemetryCollector.error(error);
        return invalidAuthorizationToken;
      }

      break;
    }
    case 'basic': {
      if (authorizationToken !== 'Basic') {
        return invalidAuthorizationTokenFormat;
      }

      const [username, password] = Buffer.from(token, 'base64')
        .toString('utf-8')
        .split(':');

      if (!username || !password) {
        return invalidAuthorizationTokenFormat;
      }

      if (!authorizationMethod.login(username, password)) {
        return invalidAuthorizationLogin;
      }

      resourceId = username;
      break;
    }
    case 'other':
      if (tokenPrefix !== authorizationMethod.tokenPrefix) {
        return invalidAuthorizationTokenFormat;
      }

      resourceId = authorizationMethod.decodeResource(token);

      break;
  }

  if (
    authorizationMethod.allowedPermissions ||
    authorizationMethod.forbiddenPermissions
  ) {
    if (!authorizationMethod.mapPermissions) {
      return [500, 'No permission mapping function provided.'];
    }

    const resourcePermissions = await authorizationMethod.mapPermissions(
      resourceId,
      req
    );

    if (authorizationMethod.allowedPermissions) {
      if (
        resourcePermissions.intersection(authorizationMethod.allowedPermissions)
          .size === 0
      ) {
        return invalidAuthorizationTokenPermissions;
      }
    }

    if (authorizationMethod.forbiddenPermissions) {
      if (
        resourcePermissions.intersection(
          authorizationMethod.forbiddenPermissions
        ).size !== 0
      ) {
        return invalidAuthorizationTokenPermissions;
      }
    }
  }

  if (authorizationMethod.allowedRoles || authorizationMethod.forbiddenRoles) {
    if (!authorizationMethod.mapRoles) {
      return [500, 'No role mapping function provided.'];
    }

    const resourceRoles = await authorizationMethod.mapRoles(resourceId, req);

    if (authorizationMethod.allowedRoles) {
      if (
        resourceRoles.intersection(authorizationMethod.allowedRoles).size === 0
      ) {
        return invalidAuthorizationTokenRoles;
      }
    }

    if (authorizationMethod.forbiddenRoles) {
      if (
        resourceRoles.intersection(authorizationMethod.forbiddenRoles).size !==
        0
      ) {
        return invalidAuthorizationTokenRoles;
      }
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
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  req: ForklaunchRequest<
    SV,
    MapParamsSchema<SV, P>,
    MapReqBodySchema<SV, ReqBody>,
    MapReqQuerySchema<SV, ReqQuery>,
    MapReqHeadersSchema<SV, ReqHeaders>
  >,
  res: ForklaunchResponse<
    unknown,
    MapResBodyMapSchema<SV, ResBodyMap>,
    MapResHeadersSchema<SV, ResHeaders>,
    LocalsObj
  >,
  next?: ForklaunchNextFunction
) {
  const auth = req.contractDetails.auth as AuthMethods<
    SV,
    MapParamsSchema<SV, P>,
    MapReqBodySchema<SV, ReqBody>,
    MapReqQuerySchema<SV, ReqQuery>,
    MapReqHeadersSchema<SV, ReqHeaders>,
    unknown
  >;

  if (auth) {
    const [error, message] =
      (await checkAuthorizationToken<
        SV,
        MapParamsSchema<SV, P>,
        MapReqBodySchema<SV, ReqBody>,
        MapReqQuerySchema<SV, ReqQuery>,
        MapReqHeadersSchema<SV, ReqHeaders>,
        unknown
      >(
        auth,
        req.headers[
          (auth.method === 'other' ? auth.headerName : undefined) ??
            'Authorization'
        ],
        req
      )) ?? [];
    if (error != null) {
      res.type('text/plain');
      res.status(error).send(message as never);
      next?.(new Error(message));
    }
  }

  next?.();
}
