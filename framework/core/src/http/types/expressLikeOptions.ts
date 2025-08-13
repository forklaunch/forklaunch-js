import { FastMCP } from '@forklaunch/fastmcp-fork';
import { AnySchemaValidator, Schema } from '@forklaunch/validator';
import { CorsOptions } from 'cors';
import { JWTPayload } from 'jose';
import { ForklaunchRequest, MapSessionSchema } from './apiDefinition.types';
import { SessionObject } from './contractDetails.types';

export type ExpressLikeGlobalAuthOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends Record<string, unknown>
> =
  | false
  | {
      sessionSchema?: SessionSchema;
      scopeHeirarchy?: string[];
      surfaceScopes?: (
        payload: JWTPayload & SessionSchema,
        req?: ForklaunchRequest<
          SV,
          Record<string, string>,
          Record<string, unknown>,
          Record<string, unknown>,
          Record<string, unknown>,
          string,
          SessionSchema
        >
      ) => Set<string> | Promise<Set<string>>;
      surfacePermissions?: (
        payload: JWTPayload & SessionSchema,
        req?: ForklaunchRequest<
          SV,
          Record<string, string>,
          Record<string, unknown>,
          Record<string, unknown>,
          Record<string, unknown>,
          string,
          SessionSchema
        >
      ) => Set<string> | Promise<Set<string>>;
      surfaceRoles?: (
        payload: JWTPayload & SessionSchema,
        req?: ForklaunchRequest<
          SV,
          Record<string, string>,
          Record<string, unknown>,
          Record<string, unknown>,
          Record<string, unknown>,
          string,
          SessionSchema
        >
      ) => Set<string> | Promise<Set<string>>;
    };

export type ExpressLikeSchemaGlobalAuthOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeGlobalAuthOptions<SV, MapSessionSchema<SV, SessionSchema>>;

export type ExpressLikeRouterOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = {
  auth?: ExpressLikeSchemaGlobalAuthOptions<SV, SessionSchema>;
  validation?:
    | false
    | {
        request?: 'none' | 'warning' | 'error';
        response?: 'none' | 'warning' | 'error';
      };
};

export type ExpressLikeApplicationOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeRouterOptions<SV, SessionSchema> & {
  hosting?: {
    host?: string;
    port?: number;
    ssl?:
      | {
          enabled?: boolean;
          cert: string;
        }
      | boolean;
    workers?: number;
  };
  mcp?:
    | false
    | {
        port?: number;
        options?: ConstructorParameters<
          typeof FastMCP<Schema<SessionSchema, SV>>
        >[0];
      };
  openapi?:
    | false
    | {
        path?: `/${string}`;
        title?: string;
        description?: string;
        contact?: {
          name?: string;
          email?: string;
        };
        discreteVersions?: boolean;
      };
  cors?: CorsOptions;
};
