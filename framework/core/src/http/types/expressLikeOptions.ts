import {
  AnySchemaValidator,
  IdiomaticSchema,
  Schema
} from '@forklaunch/validator';
import { FastMCP } from 'fastmcp';
import { JWTPayload } from 'jose';
import { TelemetryOptions } from './openTelemetryCollector.types';

export type ExpressLikeRouterOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends IdiomaticSchema<SV>
> = {
  auth?:
    | false
    | {
        sessionSchema?: SessionSchema;
        mapPermissions?: (permissions: string[]) => JWTPayload & SessionSchema;
        mapRoles?: (roles: string[]) => JWTPayload & SessionSchema;
      };

  validation?:
    | false
    | {
        request?: 'none' | 'warning' | 'error';
        response?: 'none' | 'warning' | 'error';
      };
  telemetry?: TelemetryOptions;
  openapi?:
    | false
    | {
        title?: string;
        description?: string;
        contact?: {
          name?: string;
          email?: string;
        };
      };
};

export type ExpressLikeApplicationOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends IdiomaticSchema<SV> | undefined
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
};
