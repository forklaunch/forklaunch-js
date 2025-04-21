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
import { BullMqWorkerConsumer } from '@forklaunch/implementation-worker-bullmq/consumers';
import { BullMqWorkerProducer } from '@forklaunch/implementation-worker-bullmq/producers';
import { BullMqWorkerSchemas } from '@forklaunch/implementation-worker-bullmq/schemas';
import { DatabaseWorkerConsumer } from '@forklaunch/implementation-worker-database/consumers';
import { DatabaseWorkerProducer } from '@forklaunch/implementation-worker-database/producers';
import { DatabaseWorkerSchemas } from '@forklaunch/implementation-worker-database/schemas';
import { KafkaWorkerConsumer } from '@forklaunch/implementation-worker-kafka/consumers';
import { KafkaWorkerProducer } from '@forklaunch/implementation-worker-kafka/producers';
import { KafkaWorkerSchemas } from '@forklaunch/implementation-worker-kafka/schemas';
import { RedisWorkerConsumer } from '@forklaunch/implementation-worker-redis/consumers';
import { RedisWorkerProducer } from '@forklaunch/implementation-worker-redis/producers';
import { RedisWorkerSchemas } from '@forklaunch/implementation-worker-redis/schemas';
import { RedisWorkerOptions } from '@forklaunch/implementation-worker-redis/types';
import {
  WorkerFailureHandler,
  WorkerProcessFunction
} from '@forklaunch/interfaces-worker/types';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { BullMqWorkerOptions } from '../implementations/worker/bullmq/lib/types/bullMqWorker.types';
import { DatabaseWorkerOptions } from '../implementations/worker/database/lib/types/databaseWorker.types';
import { KafkaWorkerOptions } from '../implementations/worker/kafka/lib/types/kafkaWorker.types';
import { BaseSampleWorkerService } from './domain/services/sampleWorker.service';
import { SampleWorkerEvent } from './persistence/entities';

const BullMqWorkerOptionsSchema = BullMqWorkerSchemas({
  validator: SchemaValidator()
});

const KafkaWorkerOptionsSchema = KafkaWorkerSchemas({
  validator: SchemaValidator()
});

const RedisWorkerOptionsSchema = RedisWorkerSchemas({
  validator: SchemaValidator()
});

const DatabaseWorkerOptionsSchema = DatabaseWorkerSchemas({
  validator: SchemaValidator()
});

//! defines the configuration schema for the application
export function createDependencies({ orm }: { orm: MikroORM }) {
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
    SampleWorkerBullMqConsumer: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
        failureHandler: WorkerFailureHandler<SampleWorkerEvent>
      ) => BullMqWorkerConsumer<SampleWorkerEvent, BullMqWorkerOptions>,
      factory:
        ({ SAMPLE_WORKER_QUEUE, BullMqWorkerOptions }) =>
        (
          processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
          failureHandler: WorkerFailureHandler<SampleWorkerEvent>
        ) =>
          new BullMqWorkerConsumer(
            SAMPLE_WORKER_QUEUE,
            BullMqWorkerOptions,
            processEventsFunction,
            failureHandler
          )
    },
    SampleWorkerRedisConsumer: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
        failureHandler: WorkerFailureHandler<SampleWorkerEvent>
      ) => RedisWorkerConsumer<SampleWorkerEvent, RedisWorkerOptions>,
      factory:
        ({ TtlCache, SAMPLE_WORKER_QUEUE, RedisWorkerOptions }) =>
        (
          processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
          failureHandler: WorkerFailureHandler<SampleWorkerEvent>
        ) =>
          new RedisWorkerConsumer(
            SAMPLE_WORKER_QUEUE,
            TtlCache,
            RedisWorkerOptions,
            processEventsFunction,
            failureHandler
          )
    },
    SampleWorkerDatabaseConsumer: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
        failureHandler: WorkerFailureHandler<SampleWorkerEvent>
      ) => DatabaseWorkerConsumer<SampleWorkerEvent, DatabaseWorkerOptions>,
      factory:
        ({ EntityManager, DatabaseWorkerOptions }) =>
        (
          processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
          failureHandler: WorkerFailureHandler<SampleWorkerEvent>
        ) =>
          new DatabaseWorkerConsumer(
            SampleWorkerEvent,
            EntityManager,
            DatabaseWorkerOptions,
            processEventsFunction,
            failureHandler
          )
    },
    SampleWorkerKafkaConsumer: {
      lifetime: Lifetime.Scoped,
      type: (
        processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
        failureHandler: WorkerFailureHandler<SampleWorkerEvent>
      ) => KafkaWorkerConsumer<SampleWorkerEvent, KafkaWorkerOptions>,
      factory:
        ({ SAMPLE_WORKER_QUEUE, KafkaWorkerOptions }) =>
        (
          processEventsFunction: WorkerProcessFunction<SampleWorkerEvent>,
          failureHandler: WorkerFailureHandler<SampleWorkerEvent>
        ) =>
          new KafkaWorkerConsumer(
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
export type SchemaDependencies = DependencyShapes<typeof createDependencies>;
