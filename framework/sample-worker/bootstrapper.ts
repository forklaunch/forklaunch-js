import { RedisTtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { metrics } from '@forklaunch/framework-monitoring';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { BaseSampleWorkerService } from './services/sampleWorker.service';
//! configValidator object that defines the configuration schema for the application
export const configValidator = {
  REDIS_URL: string,
  PROTOCOL: string,
  HOST: string,
  PORT: number,
  VERSION: optional(string),
  DOCS_PATH: optional(string),
  OTEL_SERVICE_NAME: string,
  OTEL_LEVEL: optional(string),
  OTEL_EXPORTER_OTLP_ENDPOINT: string,
  entityManager: EntityManager,
  openTelemetryCollector: OpenTelemetryCollector,
  ttlCache: RedisTtlCache,
  sampleWorkerService: BaseSampleWorkerService
};
//! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });
  //! initializes the MikroORM instance with the mikroOrmOptionsConfig
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    //! creates a new ConfigInjector instance with the SchemaValidator, configValidator, and the configuration for the application
    const configInjector = new ConfigInjector(
      SchemaValidator(),
      configValidator,
      {
        REDIS_URL: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('REDIS_URL')
        },
        PROTOCOL: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('PROTOCOL')
        },
        HOST: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('HOST')
        },
        PORT: {
          lifetime: Lifetime.Singleton,
          value: Number(getEnvVar('PORT'))
        },
        VERSION: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('VERSION') ?? 'v1'
        },
        DOCS_PATH: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('DOCS_PATH') ?? '/docs'
        },
        OTEL_SERVICE_NAME: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('OTEL_SERVICE_NAME')
        },
        OTEL_LEVEL: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('OTEL_LEVEL') || 'info'
        },
        OTEL_EXPORTER_OTLP_ENDPOINT: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT')
        },
        entityManager: {
          lifetime: Lifetime.Scoped,
          factory: (_args, _resolve, context) =>
            orm.em.fork(
              context?.entityManagerOptions as ForkOptions | undefined
            )
        },
        openTelemetryCollector: {
          lifetime: Lifetime.Singleton,
          factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
            new OpenTelemetryCollector(
              OTEL_SERVICE_NAME,
              OTEL_LEVEL || 'info',
              metrics
            )
        },
        ttlCache: {
          lifetime: Lifetime.Singleton,
          factory: ({ openTelemetryCollector }) =>
            new RedisTtlCache(60 * 60 * 1000, openTelemetryCollector, {
              url: getEnvVar('REDIS_URL')
            })
        },
        sampleWorkerService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager, ttlCache }) =>
            new BaseSampleWorkerService(entityManager, ttlCache)
        }
      }
    );
    callback(
      configInjector.validateConfigSingletons(getEnvVar('ENV_FILE_PATH'))
    );
  });
}
