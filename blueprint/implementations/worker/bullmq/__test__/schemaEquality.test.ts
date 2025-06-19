import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/internal';
import { BullMqWorkerOptionsSchema as TypeboxBullMqWorkerOptionsSchema } from '../schemas/typebox/bullMqWorker.schema';
import { BullMqWorkerOptionsSchema as ZodBullMqWorkerOptionsSchema } from '../schemas/zod/bullMqWorker.schema';
import { BullMqWorkerOptions } from '../types/bullMqWorker.types';

describe('schema equality', () => {
  it('should be equal for bullmq worker', () => {
    expect(
      isTrue(
        testSchemaEquality<BullMqWorkerOptions>()(
          ZodBullMqWorkerOptionsSchema,
          TypeboxBullMqWorkerOptionsSchema,
          {
            backoffType: 'fixed',
            retries: 1,
            interval: 1000,
            queueOptions: {
              connection: {
                url: 'redis://localhost:6379'
              }
            }
          }
        )
      )
    ).toBeTruthy();
  });
});
