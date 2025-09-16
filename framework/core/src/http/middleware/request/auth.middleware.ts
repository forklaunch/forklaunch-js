import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { JWTPayload } from 'jose';
import { ParsedQs } from 'qs';
import { discriminateAuthMethod } from '../../discriminateAuthMethod';
import { hasPermissionChecks } from '../../guards/hasPermissionChecks';
import { hasRoleChecks } from '../../guards/hasRoleChecks';
import { hasScopeChecks } from '../../guards/hasScopeChecks';
import { isHmacMethod } from '../../guards/isHmacMethod';
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
  MapSessionSchema,
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
  SessionObject,
  VersionSchema
} from '../../types/contractDetails.types';
import { ExpressLikeGlobalAuthOptions } from '../../types/expressLikeOptions';

const invalidAuthorizationTokenFormat = [
  401,
  'Invalid Authorization token format.'
] as const;
const invalidAuthorizationSignature = [
  403,
  'Invalid Authorization signature.'
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
const invalidScope = [403, 'Invalid scope for operation.'] as const;
const invalidAuthorizationMethod = [
  401,
  'Invalid Authorization method.'
] as const;
const authorizationTokenRequired = [
  401,
  'Authorization token required.'
] as const;
const invalidInstantiation = [
  500,
  'Invalid instantiation of authorization method.'
] as const;

/**
 * Parses a HMAC token part.
 *
 * @param {string} part - The part of the token.
 * @param {string} expectedKey - The expected key.
 * @returns {string | undefined} - The parsed part.
 */
function parseHmacTokenPart(
  part: string,
  expectedKey: string
): string | undefined {
  if (!part) return undefined;
  const [key, ...rest] = part.split('=');
  if (key !== expectedKey || rest.length === 0) return undefined;
  return rest.join('=');
}

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
  SessionSchema extends SessionObject<SV>,
  BaseRequest
>(
  req: ForklaunchRequest<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    Extract<keyof VersionedReqs, string>,
    SessionSchema
  >,
  authorizationMethod?: AuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedReqs,
    BaseRequest
  >,
  authorizationToken?: string,
  globalOptions?: ExpressLikeGlobalAuthOptions<SV, SessionSchema>
): Promise<readonly [401 | 403 | 500, string] | undefined> {
  if (authorizationMethod == null) {
    return undefined;
  }

  const collapsedAuthorizationMethod = {
    ...globalOptions,
    ...authorizationMethod
  };

  if (authorizationToken == null) {
    return authorizationTokenRequired;
  }

  const [tokenPrefix, ...tokenParts] = authorizationToken.split(' ');

  if (!tokenParts.length || !tokenPrefix) {
    return invalidAuthorizationTokenFormat;
  }

  let sessionPayload: (JWTPayload & SessionSchema) | null;

  const { type, auth } = await discriminateAuthMethod(
    collapsedAuthorizationMethod as AuthMethods<
      SV,
      P,
      ReqBody,
      ReqQuery,
      ReqHeaders,
      VersionedReqs,
      BaseRequest
    >
  );

  switch (type) {
    case 'hmac': {
      const [keyId, timestamp, nonce, signature] = tokenParts;
      if (
        keyId == null ||
        timestamp == null ||
        nonce == null ||
        signature == null ||
        tokenPrefix !== (collapsedAuthorizationMethod.tokenPrefix ?? 'HMAC')
      ) {
        return invalidAuthorizationToken;
      }

      if (!collapsedAuthorizationMethod.hmac?.secretKeys) {
        return invalidInstantiation;
      }

      const parsedKeyId = parseHmacTokenPart(keyId, 'keyId');
      const parsedTimestamp = parseHmacTokenPart(timestamp, 'ts');
      const parsedNonce = parseHmacTokenPart(nonce, 'nonce');
      const parsedSignature = parseHmacTokenPart(signature, 'signature');

      if (
        !parsedKeyId ||
        !parsedTimestamp ||
        !parsedNonce ||
        !parsedSignature
      ) {
        return invalidAuthorizationTokenFormat;
      }

      const verificationResult = await auth.verificationFunction({
        method: req?.method ?? '',
        path: req?.path ?? '',
        body: req?.body,
        timestamp: new Date(parsedTimestamp),
        nonce: parsedNonce,
        signature: parsedSignature,
        secretKey: collapsedAuthorizationMethod.hmac.secretKeys[parsedKeyId]
      });

      if (!verificationResult) {
        return invalidAuthorizationSignature;
      }

      sessionPayload = null;
      break;
    }
    case 'jwt': {
      const [token] = tokenParts;
      if (
        tokenPrefix !== (collapsedAuthorizationMethod.tokenPrefix ?? 'Bearer')
      ) {
        return invalidAuthorizationTokenFormat;
      }

      try {
        const decodedJwt =
          'decodeResource' in auth && auth.decodeResource
            ? await auth.decodeResource(token)
            : 'verificationFunction' in auth && auth.verificationFunction
              ? await auth.verificationFunction(token)
              : undefined;

        if (!decodedJwt) {
          return invalidAuthorizationToken;
        }

        sessionPayload = decodedJwt as JWTPayload & SessionSchema;
      } catch (error) {
        (
          req as ForklaunchRequest<
            SV,
            P,
            ReqBody,
            ReqQuery,
            ReqHeaders,
            Extract<keyof VersionedReqs, string>,
            SessionSchema
          >
        )?.openTelemetryCollector.error(error);
        return invalidAuthorizationToken;
      }

      break;
    }
    case 'basic': {
      const [token] = tokenParts;

      if (
        tokenPrefix !== (collapsedAuthorizationMethod.tokenPrefix ?? 'Basic')
      ) {
        return invalidAuthorizationTokenFormat;
      }

      if (auth.decodeResource) {
        sessionPayload = (await auth.decodeResource(token)) as JWTPayload &
          SessionSchema;
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

        sessionPayload = {
          sub: username
        } as JWTPayload & SessionSchema;
      }
      break;
    }
    default:
      isNever(type);
      return [401, 'Invalid Authorization method.'];
  }

  if (isHmacMethod(collapsedAuthorizationMethod) && sessionPayload == null) {
    return;
  }

  if (sessionPayload == null) {
    return invalidAuthorizationToken;
  }

  req.session = sessionPayload;

  if (hasScopeChecks(collapsedAuthorizationMethod)) {
    if (collapsedAuthorizationMethod.surfaceScopes) {
      const resourceScopes = await collapsedAuthorizationMethod.surfaceScopes(
        sessionPayload,
        req as ResolvedForklaunchRequest<
          SV,
          P,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          VersionedReqs,
          SessionSchema,
          BaseRequest
        >
      );

      if (collapsedAuthorizationMethod.scopeHeirarchy) {
        if (collapsedAuthorizationMethod.requiredScope) {
          if (
            !resourceScopes.has(collapsedAuthorizationMethod.requiredScope) ||
            Array.from(resourceScopes).every(
              (scope) =>
                collapsedAuthorizationMethod.scopeHeirarchy?.indexOf(scope) ??
                -1 > -1
            )
          ) {
            return invalidScope;
          }
        }
      }
    }
  }

  if (hasPermissionChecks(collapsedAuthorizationMethod)) {
    if (!collapsedAuthorizationMethod.surfacePermissions) {
      return [500, 'No permission surfacing function provided.'];
    }

    const resourcePermissions =
      await collapsedAuthorizationMethod.surfacePermissions(
        sessionPayload,
        req as ResolvedForklaunchRequest<
          SV,
          P,
          ReqBody,
          ReqQuery,
          ReqHeaders,
          VersionedReqs,
          SessionSchema,
          BaseRequest
        >
      );

    if (
      'allowedPermissions' in collapsedAuthorizationMethod &&
      collapsedAuthorizationMethod.allowedPermissions
    ) {
      if (
        resourcePermissions.intersection(
          collapsedAuthorizationMethod.allowedPermissions
        ).size === 0
      ) {
        return invalidAuthorizationTokenPermissions;
      }
    }

    if (
      'forbiddenPermissions' in collapsedAuthorizationMethod &&
      collapsedAuthorizationMethod.forbiddenPermissions
    ) {
      if (
        resourcePermissions.intersection(
          collapsedAuthorizationMethod.forbiddenPermissions
        ).size !== 0
      ) {
        return invalidAuthorizationTokenPermissions;
      }
    }
  } else if (hasRoleChecks(collapsedAuthorizationMethod)) {
    if (!collapsedAuthorizationMethod.surfaceRoles) {
      return [500, 'No role surfacing function provided.'];
    }

    const resourceRoles = await collapsedAuthorizationMethod.surfaceRoles(
      sessionPayload,
      req as ResolvedForklaunchRequest<
        SV,
        P,
        ReqBody,
        ReqQuery,
        ReqHeaders,
        VersionedReqs,
        SessionSchema,
        BaseRequest
      >
    );

    if (
      'allowedRoles' in collapsedAuthorizationMethod &&
      collapsedAuthorizationMethod.allowedRoles
    ) {
      if (
        resourceRoles.intersection(collapsedAuthorizationMethod.allowedRoles)
          .size === 0
      ) {
        return invalidAuthorizationTokenRoles;
      }
    }

    if (
      'forbiddenRoles' in collapsedAuthorizationMethod &&
      collapsedAuthorizationMethod.forbiddenRoles
    ) {
      if (
        resourceRoles.intersection(collapsedAuthorizationMethod.forbiddenRoles)
          .size !== 0
      ) {
        return invalidAuthorizationTokenRoles;
      }
    }
  } else {
    return invalidAuthorizationMethod;
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
  VersionedApi extends VersionSchema<SV, ContractMethod>,
  SessionSchema extends SessionObject<SV>
>(
  req: ForklaunchRequest<
    SV,
    MapParamsSchema<SV, P>,
    MapReqBodySchema<SV, ReqBody>,
    MapReqQuerySchema<SV, ReqQuery>,
    MapReqHeadersSchema<SV, ReqHeaders>,
    Extract<keyof MapVersionedReqsSchema<SV, VersionedApi>, string>,
    MapSessionSchema<SV, SessionSchema>
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

  const [error, message] =
    (await checkAuthorizationToken<
      SV,
      MapParamsSchema<SV, P>,
      MapReqBodySchema<SV, ReqBody>,
      MapReqQuerySchema<SV, ReqQuery>,
      MapReqHeadersSchema<SV, ReqHeaders>,
      MapVersionedReqsSchema<SV, VersionedApi>,
      MapSessionSchema<SV, SessionSchema>,
      unknown
    >(
      req,
      auth,
      (req.headers[auth?.headerName ?? 'Authorization'] as string) ||
        (req.headers[auth?.headerName ?? 'authorization'] as string),
      req._globalOptions?.()?.auth
    )) ?? [];
  if (error != null) {
    res.type('text/plain');
    res.status(error).send(message as never);
    return;
  }

  next?.();
}
