import {
  WorkerFailureHandler,
  WorkerProcessFunction
} from '@forklaunch/interfaces-worker/types';
import { bootstrap } from './bootstrapper';
import { SampleWorkerEvent } from './persistence/entities/sampleWorkerEvent.entity';

bootstrap(async (ci, tokens) => {
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

  const processEvents: (
    name: string
  ) => WorkerProcessFunction<SampleWorkerEvent> =
    (name: string) => async (events) => {
      const failedEvents = [];

      for (const event of events) {
        try {
          openTelemetryCollector.info(
            `processing message from ${name}: ${event.message}`
          );
          event.processed = true;
        } catch (error) {
          failedEvents.push({
            value: event,
            error: error as Error
          });
        }
      }

      return failedEvents;
    };

  const processErrors: WorkerFailureHandler<SampleWorkerEvent> = async (
    events
  ) => {
    events.forEach((event) => {
      openTelemetryCollector.error(
        event.error,
        'error processing message',
        event.value
      );
    });
  };

  const queues = [];

  const databaseWorkerConsumer = ci.resolve(
    tokens.SampleWorkerDatabaseConsumer
  );
  queues.push(
    databaseWorkerConsumer(processEvents('database'), processErrors).start()
  );

  const redisWorkerConsumer = ci.resolve(tokens.SampleWorkerRedisConsumer);
  queues.push(
    redisWorkerConsumer(processEvents('redis'), processErrors).start()
  );

  const bullMqWorkerConsumer = ci.resolve(tokens.SampleWorkerBullMqConsumer);
  queues.push(
    bullMqWorkerConsumer(processEvents('bullmq'), processErrors).start()
  );

  const kafkaWorkerConsumer = ci.resolve(tokens.SampleWorkerKafkaConsumer);
  queues.push(
    kafkaWorkerConsumer(processEvents('kafka'), processErrors).start()
  );

  await Promise.all(queues);
});
