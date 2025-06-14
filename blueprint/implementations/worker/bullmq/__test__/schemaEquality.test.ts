import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/core/test';
import { BullMqWorkerOptionsSchema as TypeboxBullMqWorkerOptionsSchema } from '../schemas/typebox/bullMqWorker.schema';
import { BullMqWorkerOptionsSchema as ZodBullMqWorkerOptionsSchema } from '../schemas/zod/bullMqWorker.schema';

describe('schema equality', () => {
  it('should be equal for bullmq worker', () => {
    expect(
      isTrue(
        testSchemaEquality(
          ZodBullMqWorkerOptionsSchema,
          TypeboxBullMqWorkerOptionsSchema,
          {
            backoffType: 'fixed',
            retries: 1,
            interval: 1000,
            connection: {
              url: 'redis://localhost:6379'
            }
          }
        )
      )
    ).toBeTruthy();
  });
});
