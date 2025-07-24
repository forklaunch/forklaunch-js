import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { decodeJwt, JWTPayload, jwtVerify } from 'jose';
import { ParsedQs } from 'qs';
import { discriminateAuthMethod } from '../../discriminateAuthMethod';
import { hasPermissionChecks } from '../../guards/hasPermissionChecks';
import { hasRoleChecks } from '../../guards/hasRoleChecks';
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
  MapVersionedReqsSchema,
  ResolvedForklaunchRequest,
  VersionedRequests
} from '../../types/apiDefinition.types';
import {
  AuthMethods,
  Body,
  HeadersObject,
  Method,
  ParamsDictionary,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  VersionSchema
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
  VersionedReqs extends VersionedRequests,
  BaseRequest
>(
  authorizationMethod: AuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedReqs,
    BaseRequest
  >,
  authorizationToken?: string,
  req?: ForklaunchRequest<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    Extract<keyof VersionedReqs, string>
  >
): Promise<readonly [401 | 403 | 500, string] | undefined> {
  if (authorizationToken == null) {
    return [401, 'No Authorization token provided.'];
  }

  const [tokenPrefix, token] = authorizationToken.split(' ');

  let resourceId: JWTPayload;

  const { type, auth } = discriminateAuthMethod(authorizationMethod);

  switch (type) {
    case 'jwt': {
      if (tokenPrefix !== (authorizationMethod.tokenPrefix ?? 'Bearer')) {
        return invalidAuthorizationTokenFormat;
      }

      try {
        const decodedJwt =
          (await auth?.decodeResource?.(token)) ??
          (
            await jwtVerify(
              token,
              new TextEncoder().encode(process.env.JWT_SECRET)
            )
          ).payload;

        if (!decodedJwt) {
          return invalidAuthorizationSubject;
        }

        resourceId = decodedJwt;
      } catch (error) {
        (
          req as ForklaunchRequest<
            SV,
            P,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            Extract<keyof VersionedReqs, string>
          >
        )?.openTelemetryCollector.error(error);
        return invalidAuthorizationToken;
      }

      break;
    }
    case 'basic': {
      if (tokenPrefix !== (authorizationMethod.tokenPrefix ?? 'Basic')) {
        return invalidAuthorizationTokenFormat;
      }

      if (auth.decodeResource) {
        resourceId = await auth.decodeResource(token);
      } else {
        const [username, password] = Buffer.from(token, 'base64')
          .toString('utf-8')
          .split(':');

        if (!username || !password) {
          return invalidAuthorizationTokenFormat;
        }

        if (!auth.login(username, password)) {
          return invalidAuthorizationLogin;
        }

        resourceId = {
          sub: username
        };
      }
      break;
    }
    default:
      isNever(type);
      return [401, 'Invalid Authorization method.'];
  }

  if (hasPermissionChecks(authorizationMethod)) {
    if (!authorizationMethod.mapPermissions) {
      return [500, 'No permission mapping function provided.'];
    }

    const resourcePermissions = await authorizationMethod.mapPermissions(
      resourceId,
      req as ResolvedForklaunchRequest<
        SV,
        P,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        VersionedReqs,
        BaseRequest
      >
    );

    if (
      'allowedPermissions' in authorizationMethod &&
      authorizationMethod.allowedPermissions
    ) {
      if (
        resourcePermissions.intersection(authorizationMethod.allowedPermissions)
          .size === 0
      ) {
        return invalidAuthorizationTokenPermissions;
      }
    }

    if (
      'forbiddenPermissions' in authorizationMethod &&
      authorizationMethod.forbiddenPermissions
    ) {
      if (
        resourcePermissions.intersection(
          authorizationMethod.forbiddenPermissions
        ).size !== 0
      ) {
        return invalidAuthorizationTokenPermissions;
      }
    }
  } else if (hasRoleChecks(authorizationMethod)) {
    if (!authorizationMethod.mapRoles) {
      return [500, 'No role mapping function provided.'];
    }

    const resourceRoles = await authorizationMethod.mapRoles(
      resourceId,
      req as ResolvedForklaunchRequest<
        SV,
        P,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        VersionedReqs,
        BaseRequest
      >
    );

    if (
      'allowedRoles' in authorizationMethod &&
      authorizationMethod.allowedRoles
    ) {
      if (
        resourceRoles.intersection(authorizationMethod.allowedRoles).size === 0
      ) {
        return invalidAuthorizationTokenRoles;
      }
    }

    if (
      'forbiddenRoles' in authorizationMethod &&
      authorizationMethod.forbiddenRoles
    ) {
      if (
        resourceRoles.intersection(authorizationMethod.forbiddenRoles).size !==
        0
      ) {
        return invalidAuthorizationTokenRoles;
      }
    }
  } else {
    return [401, 'Invalid Authorization method.'];
  }
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
  ContractMethod extends Method,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>,
  VersionedApi extends VersionSchema<SV, ContractMethod>
>(
  req: ForklaunchRequest<
    SV,
    MapParamsSchema<SV, P>,
    MapReqBodySchema<SV, ReqBody>,
    MapReqQuerySchema<SV, ReqQuery>,
    MapReqHeadersSchema<SV, ReqHeaders>,
    Extract<keyof MapVersionedReqsSchema<SV, VersionedApi>, string>
  >,
  res: ForklaunchResponse<
    unknown,
    MapResBodyMapSchema<SV, ResBodyMap>,
    MapResHeadersSchema<SV, ResHeaders>,
    LocalsObj,
    Extract<keyof MapVersionedReqsSchema<SV, VersionedApi>, string>
  >,
  next?: ForklaunchNextFunction
) {
  const auth = req.contractDetails.auth as
    | AuthMethods<
        SV,
        MapParamsSchema<SV, P>,
        MapReqBodySchema<SV, ReqBody>,
        MapReqQuerySchema<SV, ReqQuery>,
        MapReqHeadersSchema<SV, ReqHeaders>,
        MapVersionedReqsSchema<SV, VersionedApi>,
        unknown
      >
    | undefined;

  if (auth) {
    const [error, message] =
      (await checkAuthorizationToken<
        SV,
        MapParamsSchema<SV, P>,
        MapReqBodySchema<SV, ReqBody>,
        MapReqQuerySchema<SV, ReqQuery>,
        MapReqHeadersSchema<SV, ReqHeaders>,
        MapVersionedReqsSchema<SV, VersionedApi>,
        unknown
      >(
        auth,
        (req.headers[auth.headerName ?? 'Authorization'] as string) ||
          (req.headers[auth.headerName ?? 'authorization'] as string),
        // we can safely cast here because we know that the user will supply resolution for the request
        req
      )) ?? [];
    if (error != null) {
      res.type('text/plain');
      res.status(error).send(message as never);
      return;
    }

    req.session = decodeJwt(
      (req.headers[auth.headerName ?? 'Authorization'] as string) ||
        (req.headers[auth.headerName ?? 'authorization'] as string)
    );
  }

  next?.();
}
