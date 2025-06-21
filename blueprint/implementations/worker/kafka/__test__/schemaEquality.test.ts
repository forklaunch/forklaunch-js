import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/internal';
import { KafkaWorkerOptionsSchema as TypeboxKafkaWorkerOptionsSchema } from '../domain/schemas/typebox/kafkaWorker.schema';
import { KafkaWorkerOptionsSchema as ZodKafkaWorkerOptionsSchema } from '../domain/schemas/zod/kafkaWorker.schema';
import { KafkaWorkerOptions } from '../domain/types/kafkaWorker.types';

describe('schema equality', () => {
  it('should be equal for bullmq worker', () => {
    expect(
      isTrue(
        testSchemaEquality<KafkaWorkerOptions>()(
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
