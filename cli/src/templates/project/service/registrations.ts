import { {{#is_kafka_enabled}}array,{{/is_kafka_enabled}} number, SchemaValidator, string } from "@{{app_name}}/core";
import { metrics } from "@{{app_name}}/monitoring";{{#is_cache_enabled}}
import { RedisTtlCache } from "@forklaunch/infrastructure-redis";{{/is_cache_enabled}}{{#is_s3_enabled}}
import { S3ObjectStore } from "@forklaunch/infrastructure-s3";{{/is_s3_enabled}}
import { OpenTelemetryCollector } from "@forklaunch/core/http";
import {
  createConfigInjector,
  DependencyShapes,
  getEnvVar,
  Lifetime,
} from "@forklaunch/core/services";{{#is_worker}}
import { {{worker_type}}WorkerConsumer } from '@forklaunch/implementation-worker-{{worker_type_lowercase}}/consumers';
import { {{worker_type}}WorkerProducer } from '@forklaunch/implementation-worker-{{worker_type_lowercase}}/producers';
import { {{worker_type}}WorkerSchemas } from '@forklaunch/implementation-worker-{{worker_type_lowercase}}/schemas';
import { {{worker_type}}WorkerOptions } from '@forklaunch/implementation-worker-{{worker_type_lowercase}}/types';
import { WorkerProcessFunction, WorkerFailureHandler } from '@forklaunch/interfaces-worker/types';{{/is_worker}}{{#is_database_enabled}}
import { EntityManager, ForkOptions, MikroORM } from "@mikro-orm/core";{{/is_database_enabled}}{{#is_worker}}
import { {{pascal_case_name}}EventRecord } from "./persistence/entities/{{camel_case_name}}EventRecord.entity";{{/is_worker}}
import mikroOrmOptionsConfig from './mikro-orm.config';
import { Base{{pascal_case_name}}Service } from "./services/{{camel_case_name}}.service";
//! defines the configuration schema for the application
export function createDependencies() {
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
    },{{/is_worker}}{{#is_s3_enabled}}
    S3_REGION: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('S3_REGION')
    },
    S3_ACCESS_KEY_ID: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('S3_ACCESS_KEY_ID')
    },
    S3_SECRET_ACCESS_KEY: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('S3_SECRET_ACCESS_KEY')
    },
    S3_URL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('S3_URL')
    },
    S3_BUCKET: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('S3_BUCKET')
    },{{/is_s3_enabled}}
  });
  //! defines the runtime dependencies for the application
  const runtimeDependencies = environmentConfig.chain({
    {{#is_database_enabled}}
    MikroORM: {
      lifetime: Lifetime.Singleton,
      type: MikroORM,
      factory: () => MikroORM.initSync(mikroOrmOptionsConfig)
    },{{/is_database_enabled}}
    {{#is_worker}}WorkerOptions: {
      lifetime: Lifetime.Singleton,
      type: {{worker_type}}WorkerSchemas({
        validator: SchemaValidator()
      }),
      {{{default_worker_options}}}
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
        }, {
          enabled: true,
          level: "info",
        }),
    },{{/is_cache_enabled}}{{#is_s3_enabled}}
    S3ObjectStore: {
      lifetime: Lifetime.Singleton,
      type: S3ObjectStore,
      factory: ({
        OpenTelemetryCollector,
        OTEL_LEVEL,
        S3_REGION,
        S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY,
        S3_URL,
        S3_BUCKET
      }) =>
        new S3ObjectStore(
          OpenTelemetryCollector,
          {
            bucket: S3_BUCKET,
            clientConfig: {
              endpoint: S3_URL,
              region: S3_REGION,
              credentials: {
                accessKeyId: S3_ACCESS_KEY_ID,
                secretAccessKey: S3_SECRET_ACCESS_KEY
              }
            }
          },
          {
            enabled: true,
            level: OTEL_LEVEL || 'info'
          }
        )
    },
    {{/is_s3_enabled}}{{#is_database_enabled}}
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: ({ MikroORM }, _resolve, context) =>
        MikroORM.em.fork(context?.entityManagerOptions as ForkOptions | undefined),
    },{{/is_database_enabled}}
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({ {{#is_worker}}
    WorkerConsumer: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: WorkerProcessFunction<{{pascal_case_name}}EventRecord>,
        failureHandler: WorkerFailureHandler<{{pascal_case_name}}EventRecord>
      ) => {{worker_type}}WorkerConsumer<{{pascal_case_name}}EventRecord, {{worker_type}}WorkerOptions>,
      factory: 
        {{{worker_consumer_factory}}}
    },
    WorkerProducer: {
      lifetime: Lifetime.Scoped,
      type: {{worker_type}}WorkerProducer,
      factory: {{{worker_producer_factory}}}
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
