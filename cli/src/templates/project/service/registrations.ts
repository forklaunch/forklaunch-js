import { number, SchemaValidator, string } from "@{{app_name}}/core";
import { metrics } from "@{{app_name}}/monitoring";
{{#cache_backend}}import { RedisTtlCache } from "@forklaunch/core/cache";{{/cache_backend}}
import { OpenTelemetryCollector } from "@forklaunch/core/http";
import {
  createConfigInjector,
  DependencyShapes,
  getEnvVar,
  Lifetime,
} from "@forklaunch/core/services";{{^cache_backend}}
import { EntityManager, ForkOptions, MikroORM } from "@mikro-orm/core";{{/cache_backend}}
import { Base{{pascal_case_name}}Service } from "./services/{{camel_case_name}}.service";
//! defines the configuration schema for the application
export function createDepenencies({{^cache_backend}}{ orm }: { orm: MikroORM }{{/cache_backend}}) {
  const configInjector = createConfigInjector(SchemaValidator(), {
    SERVICE_METADATA: {
      lifetime: Lifetime.Singleton,
      type: {
        name: string,
        version: string,
      },
      value: {
        name: "{{service_name}}{{worker_name}}",
        version: "0.1.0",
      },
    },
  });
  //! defines the environment configuration for the application
  const environmentConfig = configInjector.chain({
    {{#cache_backend}}REDIS_URL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('REDIS_URL')
    },{{/cache_backend}}
    PROTOCOL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar("PROTOCOL"),
    },
    HOST: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar("HOST"),
    },
    PORT: {
      lifetime: Lifetime.Singleton,
      type: number,
      value: Number(getEnvVar("PORT")),
    },
    VERSION: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar("VERSION") ?? "v1",
    },
    DOCS_PATH: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar("DOCS_PATH") ?? "/docs",
    },
    OTEL_SERVICE_NAME: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar("OTEL_SERVICE_NAME"),
    },
    OTEL_LEVEL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar("OTEL_LEVEL") || "info",
    },
    OTEL_EXPORTER_OTLP_ENDPOINT: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar("OTEL_EXPORTER_OTLP_ENDPOINT"),
    },
  });
  //! defines the runtime dependencies for the application
  const runtimeDependencies = environmentConfig.chain({
    OpenTelemetryCollector: {
      lifetime: Lifetime.Singleton,
      type: OpenTelemetryCollector,
      factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
        new OpenTelemetryCollector(
          OTEL_SERVICE_NAME,
          OTEL_LEVEL || "info",
          metrics
        ),
    },{{#cache_backend}}
    TtlCache: {
      lifetime: Lifetime.Singleton,
      type: RedisTtlCache,
      factory: ({ REDIS_URL, OpenTelemetryCollector }) =>
        new RedisTtlCache(60 * 60 * 1000, OpenTelemetryCollector, {
          url: REDIS_URL,
        }),
    },{{/cache_backend}}{{^cache_backend}}
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: (_args, _resolve, context) =>
        orm.em.fork(context?.entityManagerOptions as ForkOptions | undefined),
    },{{/cache_backend}}
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({
    {{pascal_case_name}}Service: {
      lifetime: Lifetime.Scoped,
      type: Base{{pascal_case_name}}Service,
      factory: ({ {{^cache_backend}}
        EntityManager,{{/cache_backend}}{{#cache_backend}}
        TtlCache,{{/cache_backend}}
        OpenTelemetryCollector
      }) =>
        new Base{{pascal_case_name}}Service({{^cache_backend}}
          EntityManager,{{/cache_backend}}{{#cache_backend}}
          TtlCache,{{/cache_backend}}
          OpenTelemetryCollector
        )
    }
  });
  //! returns the various dependencies for the application
  return {
    environmentConfig,
    runtimeDependencies,
    serviceDependencies,
    tokens: serviceDependencies.tokens(),
  };
}
//! defines the type for the service dependencies
export type SchemaDependencies = DependencyShapes<typeof createDepenencies>;
