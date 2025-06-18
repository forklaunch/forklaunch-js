import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/core/test';
import { DatabaseWorkerOptionsSchema as TypeboxDatabaseWorkerOptionsSchema } from '../schemas/typebox/databaseWorker.schema';
import { DatabaseWorkerOptionsSchema as ZodDatabaseWorkerOptionsSchema } from '../schemas/zod/databaseWorker.schema';
import { DatabaseWorkerOptions } from '../types/databaseWorker.types';

describe('schema equality', () => {
  it('should be equal for bullmq worker', () => {
    expect(
      isTrue(
        testSchemaEquality<DatabaseWorkerOptions>()(
          ZodDatabaseWorkerOptionsSchema,
          TypeboxDatabaseWorkerOptionsSchema,
          {
            retries: 1,
            interval: 1000
          }
        )
      )
    ).toBeTruthy();
  });
});
