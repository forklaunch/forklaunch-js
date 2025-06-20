import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/internal';
import { BullMqWorkerOptionsSchema as TypeboxBullMqWorkerOptionsSchema } from '../domain/schemas/typebox/bullMqWorker.schema';
import { BullMqWorkerOptionsSchema as ZodBullMqWorkerOptionsSchema } from '../domain/schemas/zod/bullMqWorker.schema';
import { BullMqWorkerOptions } from '../domain/types/bullMqWorker.types';

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
