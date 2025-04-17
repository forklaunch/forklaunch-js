import { bootstrap } from './bootstrapper';
import {
  SampleWorkerFailureHandler,
  SampleWorkerProcessFunction
} from './domain/interfaces/sampleWorkerClient.interface';

bootstrap((ci, tokens) => {
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

  const processEvents: SampleWorkerProcessFunction = async (events) => {
    const failedEvents = [];

    for (const event of events) {
      try {
        openTelemetryCollector.info(`processing message: ${event.message}`);
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

  const processErrors: SampleWorkerFailureHandler = async (records) => {
    records.forEach((record) => {
      openTelemetryCollector.error(
        record.error,
        'error processing message',
        record.value
      );
    });
  };

  const databaseWorkerClient = ci.resolve(tokens.SampleWorkerDatabaseClient);
  databaseWorkerClient(processEvents, processErrors);

  const redisWorkerClient = ci.resolve(tokens.SampleWorkerRedisClient);
  redisWorkerClient(processEvents, processErrors).start();

  const bullMqWorkerClient = ci.resolve(tokens.SampleWorkerBullMqClient);
  bullMqWorkerClient(processEvents, processErrors).start();

  const kafkaWorkerClient = ci.resolve(tokens.SampleWorkerKafkaClient);
  kafkaWorkerClient(processEvents, processErrors).start();
});
