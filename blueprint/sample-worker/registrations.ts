/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  array,
  number,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { metrics } from '@forklaunch/blueprint-monitoring';
import { RedisTtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  createConfigInjector,
  DependencyShapes,
  getEnvVar,
  Lifetime
} from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { BullMqWorkerClient } from './domain/clients/bullMqWorker.client';
import { DatabaseWorkerClient } from './domain/clients/databaseWorker.client';
import { KafkaWorkerClient } from './domain/clients/kafkaWorker.client';
import { RedisWorkerClient } from './domain/clients/redisWorker.client';
import {
  SampleWorkerFailureHandler,
  SampleWorkerProcessFunction
} from './domain/interfaces/sampleWorkerClient.interface';
import { BullMqWorkerProducer } from './domain/producers/bullMqWorker.producer';
import { DatabaseWorkerProducer } from './domain/producers/databaseWorker.producer';
import { KafkaWorkerProducer } from './domain/producers/kafkaWorker.producer';
import { RedisWorkerProducer } from './domain/producers/redisWorker.producer';
import { BullMqWorkerOptionsSchema } from './domain/schemas/bullMqWorker.schema';
import { DatabaseWorkerOptionsSchema } from './domain/schemas/databaseWorker.schema';
import { KafkaWorkerOptionsSchema } from './domain/schemas/kafkaWorker.schema';
import { RedisWorkerOptionsSchema } from './domain/schemas/redisWorker.schema';
import { BaseSampleWorkerService } from './domain/services/sampleWorker.service';

//! defines the configuration schema for the application
export function createDepenencies({ orm }: { orm: MikroORM }) {
  const configInjector = createConfigInjector(SchemaValidator(), {
    SERVICE_METADATA: {
      lifetime: Lifetime.Singleton,
      type: {
        name: string,
        version: string
      },
      value: {
        name: 'sample-worker',
        version: '0.1.0'
      }
    }
  });
  //! defines the environment configuration for the application
  const environmentConfig = configInjector.chain({
    REDIS_URL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('REDIS_URL')
    },
    PROTOCOL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('PROTOCOL')
    },
    HOST: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('HOST')
    },
    PORT: {
      lifetime: Lifetime.Singleton,
      type: number,
      value: Number(getEnvVar('PORT'))
    },
    VERSION: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('VERSION') ?? 'v1'
    },
    DOCS_PATH: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('DOCS_PATH') ?? '/docs'
    },
    OTEL_SERVICE_NAME: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('OTEL_SERVICE_NAME')
    },
    OTEL_LEVEL: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('OTEL_LEVEL') || 'info'
    },
    OTEL_EXPORTER_OTLP_ENDPOINT: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT')
    },
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
    },
    SAMPLE_WORKER_QUEUE: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('SAMPLE_WORKER_QUEUE')
    },
    RedisWorkerOptions: {
      lifetime: Lifetime.Singleton,
      type: RedisWorkerOptionsSchema,
      value: {
        pageSize: 100,
        retries: 3,
        interval: 5000
      }
    },
    BullMqWorkerOptions: {
      lifetime: Lifetime.Singleton,
      type: BullMqWorkerOptionsSchema,
      factory: ({ REDIS_URL }) => ({
        backoffType: 'exponential' as const,
        connection: {
          url: REDIS_URL
        },
        retries: 3,
        interval: 5000
      })
    },
    KafkaWorkerOptions: {
      lifetime: Lifetime.Singleton,
      type: KafkaWorkerOptionsSchema,
      factory: ({ KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID }) => ({
        brokers: KAFKA_BROKERS,
        clientId: KAFKA_CLIENT_ID,
        groupId: KAFKA_GROUP_ID,
        retries: 3,
        interval: 5000,
        peekCount: 100
      })
    },
    DatabaseWorkerOptions: {
      lifetime: Lifetime.Singleton,
      type: DatabaseWorkerOptionsSchema,
      value: {
        retries: 3,
        interval: 5000
      }
    }
  });
  //! defines the runtime dependencies for the application
  const runtimeDependencies = environmentConfig.chain({
    OpenTelemetryCollector: {
      lifetime: Lifetime.Singleton,
      type: OpenTelemetryCollector,
      factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
        new OpenTelemetryCollector(
          OTEL_SERVICE_NAME,
          OTEL_LEVEL || 'info',
          metrics
        )
    },
    TtlCache: {
      lifetime: Lifetime.Singleton,
      type: RedisTtlCache,
      factory: ({ REDIS_URL, OpenTelemetryCollector, OTEL_LEVEL }) =>
        new RedisTtlCache(
          60 * 60 * 1000,
          OpenTelemetryCollector,
          {
            url: REDIS_URL
          },
          {
            enabled: true,
            level: OTEL_LEVEL || 'info'
          }
        )
    },
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: (_args, _resolve, context) =>
        orm.em.fork(context?.entityManagerOptions as ForkOptions | undefined)
    }
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({
    SampleWorkerBullMqClient: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: SampleWorkerProcessFunction,
        failureHandler: SampleWorkerFailureHandler
      ) => BullMqWorkerClient,
      factory:
        ({ SAMPLE_WORKER_QUEUE, BullMqWorkerOptions }) =>
        (
          processEventsFunction: SampleWorkerProcessFunction,
          failureHandler: SampleWorkerFailureHandler
        ) =>
          new BullMqWorkerClient(
            SAMPLE_WORKER_QUEUE,
            BullMqWorkerOptions,
            processEventsFunction,
            failureHandler
          )
    },
    SampleWorkerRedisClient: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: SampleWorkerProcessFunction,
        failureHandler: SampleWorkerFailureHandler
      ) => RedisWorkerClient,
      factory:
        ({ TtlCache, SAMPLE_WORKER_QUEUE, RedisWorkerOptions }) =>
        (
          processEventsFunction: SampleWorkerProcessFunction,
          failureHandler: SampleWorkerFailureHandler
        ) =>
          new RedisWorkerClient(
            SAMPLE_WORKER_QUEUE,
            TtlCache,
            RedisWorkerOptions,
            processEventsFunction,
            failureHandler
          )
    },
    SampleWorkerDatabaseClient: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: SampleWorkerProcessFunction,
        failureHandler: SampleWorkerFailureHandler
      ) => DatabaseWorkerClient,
      factory:
        ({ EntityManager, DatabaseWorkerOptions }) =>
        (
          processEventsFunction: SampleWorkerProcessFunction,
          failureHandler: SampleWorkerFailureHandler
        ) =>
          new DatabaseWorkerClient(
            EntityManager,
            DatabaseWorkerOptions,
            processEventsFunction,
            failureHandler
          )
    },
    SampleWorkerKafkaClient: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: SampleWorkerProcessFunction,
        failureHandler: SampleWorkerFailureHandler
      ) => KafkaWorkerClient,
      factory:
        ({ SAMPLE_WORKER_QUEUE, KafkaWorkerOptions }) =>
        (
          processEventsFunction: SampleWorkerProcessFunction,
          failureHandler: SampleWorkerFailureHandler
        ) =>
          new KafkaWorkerClient(
            SAMPLE_WORKER_QUEUE,
            KafkaWorkerOptions,
            processEventsFunction,
            failureHandler
          )
    },
    SampleWorkerDatabaseProducer: {
      lifetime: Lifetime.Scoped,
      type: DatabaseWorkerProducer,
      factory: ({ EntityManager }) => new DatabaseWorkerProducer(EntityManager)
    },
    SampleWorkerRedisProducer: {
      lifetime: Lifetime.Scoped,
      type: RedisWorkerProducer,
      factory: ({ TtlCache, SAMPLE_WORKER_QUEUE }) =>
        new RedisWorkerProducer(SAMPLE_WORKER_QUEUE, TtlCache)
    },
    SampleWorkerKafkaProducer: {
      lifetime: Lifetime.Scoped,
      type: KafkaWorkerProducer,
      factory: ({ SAMPLE_WORKER_QUEUE, KafkaWorkerOptions }) =>
        new KafkaWorkerProducer(SAMPLE_WORKER_QUEUE, KafkaWorkerOptions)
    },
    SampleWorkerBullMqProducer: {
      lifetime: Lifetime.Scoped,
      type: BullMqWorkerProducer,
      factory: ({ SAMPLE_WORKER_QUEUE, BullMqWorkerOptions }) =>
        new BullMqWorkerProducer(SAMPLE_WORKER_QUEUE, BullMqWorkerOptions)
    },

    SampleWorkerService: {
      lifetime: Lifetime.Scoped,
      type: BaseSampleWorkerService,
      factory: ({
        SampleWorkerDatabaseProducer,
        SampleWorkerBullMqProducer,
        SampleWorkerKafkaProducer,
        SampleWorkerRedisProducer
      }) =>
        new BaseSampleWorkerService(
          SampleWorkerDatabaseProducer,
          SampleWorkerBullMqProducer,
          SampleWorkerRedisProducer,
          SampleWorkerKafkaProducer
        )
    }
  });
  //! returns the various dependencies for the application
  return {
    environmentConfig,
    runtimeDependencies,
    serviceDependencies,
    tokens: serviceDependencies.tokens()
  };
}
//! defines the type for the service dependencies
export type SchemaDependencies = DependencyShapes<typeof createDepenencies>;
