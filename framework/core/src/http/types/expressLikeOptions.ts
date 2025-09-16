import { FastMCP } from '@forklaunch/fastmcp-fork';
import { AnySchemaValidator } from '@forklaunch/validator';
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
      surfaceScopes?: SessionSchema extends infer ResolvedSessionSchema
        ? ResolvedSessionSchema extends SessionObject<SV>
          ? (
              payload: JWTPayload & ResolvedSessionSchema,
              req?: ForklaunchRequest<
                SV,
                Record<string, string>,
                Record<string, unknown>,
                Record<string, unknown>,
                Record<string, unknown>,
                string,
                ResolvedSessionSchema
              >
            ) => Set<string> | Promise<Set<string>>
          : never
        : never;
      /**
       * Function to extract a set of permissions from the JWT payload and request.
       */
      surfacePermissions?: SessionSchema extends infer ResolvedSessionSchema
        ? ResolvedSessionSchema extends SessionObject<SV>
          ? (
              payload: JWTPayload & ResolvedSessionSchema,
              req?: ForklaunchRequest<
                SV,
                Record<string, string>,
                Record<string, unknown>,
                Record<string, unknown>,
                Record<string, unknown>,
                string,
                ResolvedSessionSchema
              >
            ) => Set<string> | Promise<Set<string>>
          : never
        : never;
      /**
       * Function to extract a set of roles from the JWT payload and request.
       */
      surfaceRoles?: SessionSchema extends infer ResolvedSessionSchema
        ? ResolvedSessionSchema extends SessionObject<SV>
          ? (
              payload: JWTPayload & ResolvedSessionSchema,
              req?: ForklaunchRequest<
                SV,
                Record<string, string>,
                Record<string, unknown>,
                Record<string, unknown>,
                Record<string, unknown>,
                string,
                ResolvedSessionSchema
              >
            ) => Set<string> | Promise<Set<string>>
          : never
        : never;
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
  /**
   * OpenAPI documentation options.
   */
  openapi?: boolean;
  /**
   * MCP options.
   */
  mcp?: boolean;
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
> = Omit<ExpressLikeRouterOptions<SV, SessionSchema>, 'openapi' | 'mcp'> & {
  /**
   * Documentation configuration.
   */
  docs?: DocsConfiguration;
  /**
   * Hosting/server options.
   */
  hosting?: {
    /**
     * SSL configuration or boolean to enable/disable SSL.
     */
    ssl?: {
      /**
       * SSL certificate as a string.
       */
      certFile: string;
      /**
       * SSL key as a string.
       */
      keyFile: string;
      /**
       * SSL CA as a string.
       */
      caFile: string;
    };
    /**
     * Number of worker processes to spawn.
     */
    workerCount?: number;
    /**
     * Routing strategy to use.
     */
    routingStrategy?: 'round-robin' | 'sticky' | 'random';
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
         * Endpoint for the MCP server.
         */
        path?: `/${string}`;
        /**
         * Additional options for FastMCP.
         */
        options?: ConstructorParameters<typeof FastMCP>[0];
        /**
         * Additional tools to register with the MCP server.
         */
        additionalTools: (mcpServer: FastMCP) => void;
        /**
         * Content type mapping for the MCP server.
         */
        contentTypeMapping?: Record<string, string>;
        /**
         * Version of the MCP server.
         */
        version?: `${number}.${number}.${number}`;
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
