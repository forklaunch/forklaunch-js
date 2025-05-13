import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/core/test';
import { RedisWorkerOptionsSchema as TypeboxRedisWorkerOptionsSchema } from '../schemas/typebox/redisWorker.schema';
import { RedisWorkerOptionsSchema as ZodRedisWorkerOptionsSchema } from '../schemas/zod/redisWorker.schema';

describe('schema equality', () => {
  it('should be equal for bullmq worker', () => {
    expect(
      isTrue(
        testSchemaEquality(
          ZodRedisWorkerOptionsSchema,
          TypeboxRedisWorkerOptionsSchema,
          {
            pageSize: 10,
            retries: 1,
            interval: 1000
          }
        )
      )
    ).toBeTruthy();
  });
});
