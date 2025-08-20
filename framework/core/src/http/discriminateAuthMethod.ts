import { AnySchemaValidator } from '@forklaunch/validator';
import { JWK, JWTPayload, jwtVerify } from 'jose';
import { ParsedQs } from 'qs';
import { VersionedRequests } from './types/apiDefinition.types';
import {
  AuthMethods,
  AuthMethodsBase,
  BasicAuthMethods,
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
        decodeResource?: AuthMethodsBase['decodeResource'];
        login: BasicAuthMethods['basic']['login'];
      };
    }
  | {
      type: 'jwt';
      auth:
        | {
            decodeResource?: AuthMethodsBase['decodeResource'];
          }
        | {
            verificationFunction: (
              token: string
            ) => Promise<JWTPayload | undefined>;
          };
    }
  | {
      type: 'system';
      auth: {
        secretKey: string;
      };
    }
> {
  if ('basic' in auth) {
    return {
      type: 'basic' as const,
      auth: {
        decodeResource: auth.decodeResource,
        login: auth.basic.login
      }
    };
  } else if ('jwt' in auth && auth.jwt != null) {
    const jwt = auth.jwt;
    let verificationFunction: (
      token: string
    ) => Promise<JWTPayload | undefined>;
    if ('privateKey' in jwt) {
      verificationFunction = async (token) => {
        const { payload } = await jwtVerify(token, Buffer.from(jwt.privateKey));
        return payload;
      };
    } else {
      let jwks: JWK[];
      if ('jwksPublicKeyUrl' in jwt) {
        const jwksResponse = await fetch(jwt.jwksPublicKeyUrl);
        jwks = (await jwksResponse.json()).keys;
      } else {
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
    return {
      type: 'jwt' as const,
      auth: {
        decodeResource: auth.decodeResource,
        verificationFunction
      }
    };
  } else if ('secretKey' in auth) {
    return {
      type: 'system' as const,
      auth: {
        secretKey: auth.secretKey
      }
    };
  } else {
    return {
      type: 'jwt' as const,
      auth: {
        decodeResource: auth.decodeResource,
        verificationFunction: async (token) => {
          const { payload } = await jwtVerify(
            token,
            Buffer.from(process.env.JWT_SECRET_KEY!)
          );
          return payload;
        }
      }
    };
  }
}
