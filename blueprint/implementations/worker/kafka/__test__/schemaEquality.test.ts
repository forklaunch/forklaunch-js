import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/core/test';
import { KafkaWorkerOptionsSchema as TypeboxKafkaWorkerOptionsSchema } from '../schemas/typebox/kafkaWorker.schema';
import { KafkaWorkerOptionsSchema as ZodKafkaWorkerOptionsSchema } from '../schemas/zod/kafkaWorker.schema';

describe('schema equality', () => {
  it('should be equal for bullmq worker', () => {
    expect(
      isTrue(
        testSchemaEquality(
          ZodKafkaWorkerOptionsSchema,
          TypeboxKafkaWorkerOptionsSchema,
          {
            brokers: ['localhost:9092'],
            clientId: 'test',
            groupId: 'test',
            retries: 1,
            interval: 1000,
            peekCount: 1
          }
        )
      )
    ).toBeTruthy();
  });
});
