import { AnySchemaValidator } from '@forklaunch/validator';
import { JWK, JWTPayload, jwtVerify } from 'jose';
import { ParsedQs } from 'qs';
import { createHmacToken } from './createHmacToken';
import { isBasicAuthMethod } from './guards/isBasicAuthMethod';
import { isHmacMethod } from './guards/isHmacMethod';
import { isJwtAuthMethod } from './guards/isJwtAuthMethod';
import { VersionedRequests } from './types/apiDefinition.types';
import {
  AuthMethods,
  BasicAuthMethods,
  DecodeResource,
  ParamsDictionary
} from './types/contractDetails.types';

/**
 * Discriminates between different authentication methods and returns a typed result.
 *
 * This function analyzes the provided authentication configuration and determines
 * whether it uses basic authentication or JWT authentication. It returns a
 * discriminated union type that includes the authentication type and the
 * corresponding authentication configuration.
 *
 * @template SV - A type that extends AnySchemaValidator
 * @template P - A type that extends ParamsDictionary
 * @template ReqBody - A type that extends Record<string, unknown>
 * @template ReqQuery - A type that extends ParsedQs
 * @template ReqHeaders - A type that extends Record<string, unknown>
 * @template BaseRequest - The base request type
 *
 * @param auth - The authentication methods configuration object
 * @returns A discriminated union object with either:
 *   - `{ type: 'basic', auth: BasicAuthMethods['basic'] }` for basic authentication
 *   - `{ type: 'jwt', auth?: JwtAuthMethods['jwt'] }` for JWT authentication (auth is optional)
 *
 * @example
 * ```typescript
 * const authConfig = {
 *   basic: {
 *     login: (username: string, password: string) => boolean
 *   }
 * };
 * const result = discriminateAuthMethod(authConfig);
 * // result.type === 'basic'
 * // result.auth === authConfig.basic
 * ```
 */
export async function discriminateAuthMethod<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  VersionedReqs extends VersionedRequests,
  SessionSchema extends Record<string, unknown>,
  BaseRequest
>(
  auth: AuthMethods<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    VersionedReqs,
    SessionSchema,
    BaseRequest
  >
): Promise<
  | {
      type: 'basic';
      auth: {
        decodeResource?: DecodeResource;
        login: BasicAuthMethods['basic']['login'];
      };
    }
  | {
      type: 'jwt';
      auth:
        | {
            decodeResource?: DecodeResource;
          }
        | {
            verificationFunction: (
              token: string
            ) => Promise<JWTPayload | undefined>;
          };
    }
  | {
      type: 'hmac';
      auth: {
        secretKeys: Record<string, string>;
        verificationFunction: ({
          body,
          path,
          method,
          timestamp,
          nonce,
          signature,
          secretKey
        }: {
          method: string;
          path: string;
          body?: unknown;
          timestamp: string;
          nonce: string;
          signature: string;
          secretKey: string;
        }) => Promise<boolean | undefined>;
      };
    }
> {
  let authMethod;
  if (isBasicAuthMethod(auth)) {
    authMethod = {
      type: 'basic' as const,
      auth: {
        decodeResource: auth.decodeResource,
        login: auth.basic.login
      }
    };
  } else if (isJwtAuthMethod(auth)) {
    const jwt = auth.jwt;
    let verificationFunction: (
      token: string
    ) => Promise<JWTPayload | undefined>;
    if ('signatureKey' in jwt) {
      verificationFunction = async (token) => {
        const { payload } = await jwtVerify(
          token,
          Buffer.from(jwt.signatureKey)
        );
        return payload;
      };
    } else {
      let jwks: JWK[];
      if ('jwksPublicKeyUrl' in jwt) {
        const jwksResponse = await fetch(jwt.jwksPublicKeyUrl);
        jwks = (await jwksResponse.json()).keys;
      } else if ('jwksPublicKey' in jwt) {
        jwks = [jwt.jwksPublicKey];
      }
      verificationFunction = async (token) => {
        for (const key of jwks) {
          try {
            const { payload } = await jwtVerify(token, key);
            return payload;
          } catch {
            continue;
          }
        }
      };
    }
    authMethod = {
      type: 'jwt' as const,
      auth: {
        decodeResource: auth.decodeResource,
        verificationFunction
      }
    };
  } else if (isHmacMethod(auth)) {
    authMethod = {
      type: 'hmac' as const,
      auth: {
        secretKeys: auth.hmac.secretKeys,
        verificationFunction: async ({
          method,
          path,
          body,
          timestamp,
          nonce,
          signature,
          secretKey
        }: {
          method: string;
          path: string;
          body?: unknown;
          timestamp: string;
          nonce: string;
          signature: string;
          secretKey: string;
        }) => {
          return (
            createHmacToken({
              method,
              path,
              body,
              timestamp,
              nonce,
              secretKey
            }) === signature
          );
        }
      }
    };
  }
  if (authMethod == null) {
    throw new Error('Invalid auth method');
  }

  return authMethod;
}
