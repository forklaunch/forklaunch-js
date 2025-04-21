import { number, SchemaValidator, string } from "@{{app_name}}/core";
import { metrics } from "@{{app_name}}/monitoring";
{{#is_cache_enabled}}import { RedisTtlCache } from "@forklaunch/core/cache";{{/is_cache_enabled}}
import { OpenTelemetryCollector } from "@forklaunch/core/http";
import {
  createConfigInjector,
  DependencyShapes,
  getEnvVar,
  Lifetime,
} from "@forklaunch/core/services";{{#is_database_enabled}}
import { EntityManager, ForkOptions, MikroORM } from "@mikro-orm/core";{{/is_database_enabled}}
import { Base{{pascal_case_name}}Service } from "./services/{{camel_case_name}}.service";
//! defines the configuration schema for the application
export function createDependencies({{#is_database_enabled}}{ orm }: { orm: MikroORM }{{/is_database_enabled}}) {
  const configInjector = createConfigInjector(SchemaValidator(), {
    SERVICE_METADATA: {
      lifetime: Lifetime.Singleton,
      type: {
        name: string,
        version: string,
      },
      value: {
        name: "{{app_name}}-{{service_name}}{{worker_name}}",
        version: "0.1.0",
      },
    },
  });
  //! defines the environment configuration for the application
  const environmentConfig = configInjector.chain({
    {{#is_cache_enabled}}REDIS_URL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('REDIS_URL')
    },{{/is_cache_enabled}}
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
    },{{#is_kafka_enabled}}
    KAFKA_BROKERS: {
      lifetime: Lifetime.Singleton,
      type: array(string),
      value: getEnvVar('KAFKA_BROKERS').split(',')
    },
    KAFKA_CLIENT_ID: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('KAFKA_CLIENT_ID')
    },
    KAFKA_GROUP_ID: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('KAFKA_GROUP_ID')
    },{{/is_kafka_enabled}}{{#is_worker}}
    QUEUE_NAME: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('QUEUE_NAME')
    },{{/is_worker}}
  });
  //! defines the runtime dependencies for the application
  const runtimeDependencies = environmentConfig.chain({
    {{#is_worker}}WorkerOptions: {
      lifetime: Lifetime.Singleton,
      type: WorkerOptions,
      value: {{default_worker_options}}
    },
    {{/is_worker}}OpenTelemetryCollector: {
      lifetime: Lifetime.Singleton,
      type: OpenTelemetryCollector,
      factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
        new OpenTelemetryCollector(
          OTEL_SERVICE_NAME,
          OTEL_LEVEL || "info",
          metrics
        ),
    },{{#is_cache_enabled}}
    TtlCache: {
      lifetime: Lifetime.Singleton,
      type: RedisTtlCache,
      factory: ({ REDIS_URL, OpenTelemetryCollector }) =>
        new RedisTtlCache(60 * 60 * 1000, OpenTelemetryCollector, {
          url: REDIS_URL,
        }),
    },{{/is_cache_enabled}}{{#is_database_enabled}}
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: (_args, _resolve, context) =>
        orm.em.fork(context?.entityManagerOptions as ForkOptions | undefined),
    },{{/is_database_enabled}}
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({ {{#is_worker}}
    WorkerConsumer: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: WorkerProcessFunction<{{worker_type}}EventRecord>,
        failureHandler: WorkerFailureHandler<{{worker_type}}EventRecord>
      ) => {{worker_type}}WorkerConsumer<{{worker_type}}EventRecord, WorkerOptions>,
      factory: 
        {{worker_consumer_factory}}
    },
    WorkerProducer: {
      lifetime: Lifetime.Scoped,
      type: {{worker_type}}WorkerProducer,
      factory: {{worker_producer_factory}}
    },
    {{/is_worker}}{{pascal_case_name}}Service: {
      lifetime: Lifetime.Scoped,
      type: Base{{pascal_case_name}}Service,
      factory: ({ {{^is_worker}}
        EntityManager,{{/is_worker}}{{#is_worker}}
        WorkerProducer,{{/is_worker}}
        OpenTelemetryCollector
      }) =>
        new Base{{pascal_case_name}}Service({{^is_worker}}
          EntityManager,{{/is_worker}}{{#is_worker}}
          WorkerProducer,{{/is_worker}}
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
export type SchemaDependencies = DependencyShapes<typeof createDependencies>;
