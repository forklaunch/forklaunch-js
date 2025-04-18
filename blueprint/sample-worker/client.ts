import { bootstrap } from './bootstrapper';
import {
  SampleWorkerFailureHandler,
  SampleWorkerProcessFunction
} from './domain/interfaces/sampleWorkerClient.interface';

bootstrap(async (ci, tokens) => {
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

  const processEvents: (name: string) => SampleWorkerProcessFunction =
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

  const processErrors: SampleWorkerFailureHandler = async (events) => {
    events.forEach((event) => {
      openTelemetryCollector.error(
        event.error,
        'error processing message',
        event.value
      );
    });
  };

  const queues = [];

  const databaseWorkerClient = ci.resolve(tokens.SampleWorkerDatabaseClient);
  queues.push(
    databaseWorkerClient(processEvents('database'), processErrors).start()
  );

  const redisWorkerClient = ci.resolve(tokens.SampleWorkerRedisClient);
  queues.push(redisWorkerClient(processEvents('redis'), processErrors).start());

  const bullMqWorkerClient = ci.resolve(tokens.SampleWorkerBullMqClient);
  queues.push(
    bullMqWorkerClient(processEvents('bullmq'), processErrors).start()
  );

  const kafkaWorkerClient = ci.resolve(tokens.SampleWorkerKafkaClient);
  queues.push(kafkaWorkerClient(processEvents('kafka'), processErrors).start());

  await Promise.all(queues);
});
