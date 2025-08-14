import { FastMCP } from '@forklaunch/fastmcp-fork';
import { AnySchemaValidator, Schema } from '@forklaunch/validator';
import { CorsOptions } from 'cors';
import { JWTPayload } from 'jose';
import { ForklaunchRequest, MapSessionSchema } from './apiDefinition.types';
import { SessionObject } from './contractDetails.types';
import { DocsConfiguration } from './docsConfiguration.types';

/**
 * Options for global authentication in Express-like applications.
 *
 * @template SV - The schema validator type.
 * @template SessionSchema - The session schema type.
 *
 * Can be `false` to disable authentication, or an object specifying session schema and
 * functions to surface scopes, permissions, and roles from the JWT/session.
 */
export type ExpressLikeGlobalAuthOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends Record<string, unknown>
> =
  | false
  | {
      /**
       * Optional session schema for the authentication context.
       */
      sessionSchema?: SessionSchema;
      /**
       * Optional array describing the scope hierarchy for authorization.
       */
      scopeHeirarchy?: string[];
      /**
       * Function to extract a set of scopes from the JWT payload and request.
       */
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
      /**
       * Function to extract a set of permissions from the JWT payload and request.
       */
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
      /**
       * Function to extract a set of roles from the JWT payload and request.
       */
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

/**
 * Schema-aware version of ExpressLikeGlobalAuthOptions.
 *
 * @template SV - The schema validator type.
 * @template SessionSchema - The session object type.
 */
export type ExpressLikeSchemaGlobalAuthOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeGlobalAuthOptions<SV, MapSessionSchema<SV, SessionSchema>>;

/**
 * Options for configuring an Express-like router.
 *
 * @template SV - The schema validator type.
 * @template SessionSchema - The session object type.
 */
export type ExpressLikeRouterOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = {
  /**
   * Authentication options for the router.
   */
  auth?: ExpressLikeSchemaGlobalAuthOptions<SV, SessionSchema>;
  /**
   * Validation options for request and response.
   * Can be `false` to disable validation, or an object to configure request/response validation levels.
   */
  validation?:
    | false
    | {
        /**
         * Request validation mode: 'none', 'warning', or 'error'.
         */
        request?: 'none' | 'warning' | 'error';
        /**
         * Response validation mode: 'none', 'warning', or 'error'.
         */
        response?: 'none' | 'warning' | 'error';
      };
};

/**
 * Options for configuring an Express-like application.
 *
 * @template SV - The schema validator type.
 * @template SessionSchema - The session object type.
 */
export type ExpressLikeApplicationOptions<
  SV extends AnySchemaValidator,
  SessionSchema extends SessionObject<SV>
> = ExpressLikeRouterOptions<SV, SessionSchema> & {
  /**
   * Documentation configuration.
   */
  docs?: DocsConfiguration;
  /**
   * Hosting/server options.
   */
  hosting?: {
    /**
     * Hostname or IP address to bind the server.
     */
    host?: string;
    /**
     * Port number to listen on.
     */
    port?: number;
    /**
     * SSL configuration or boolean to enable/disable SSL.
     */
    ssl?:
      | {
          /**
           * Whether SSL is enabled.
           */
          enabled?: boolean;
          /**
           * SSL certificate as a string.
           */
          cert: string;
        }
      | boolean;
    /**
     * Number of worker processes to spawn.
     */
    workers?: number;
  };
  /**
   * FastMCP (management/control plane) options.
   * Can be `false` to disable, or an object to configure.
   */
  mcp?:
    | false
    | {
        /**
         * Port for the MCP server.
         */
        port?: number;
        /**
         * Additional options for FastMCP.
         */
        options?: ConstructorParameters<
          typeof FastMCP<Schema<SessionSchema, SV>>
        >[0];
      };
  /**
   * OpenAPI documentation options.
   * Can be `false` to disable, or an object to configure.
   */
  openapi?:
    | false
    | {
        /**
         * Path to serve the OpenAPI docs (e.g., '/openapi').
         */
        path?: `/${string}`;
        /**
         * Title for the OpenAPI documentation.
         */
        title?: string;
        /**
         * Description for the OpenAPI documentation.
         */
        description?: string;
        /**
         * Contact information for the API.
         */
        contact?: {
          /**
           * Contact name.
           */
          name?: string;
          /**
           * Contact email.
           */
          email?: string;
        };
        /**
         * Whether to enable discrete versioning for OpenAPI docs.
         */
        discreteVersions?: boolean;
      };
  /**
   * CORS configuration options.
   */
  cors?: CorsOptions;
};
