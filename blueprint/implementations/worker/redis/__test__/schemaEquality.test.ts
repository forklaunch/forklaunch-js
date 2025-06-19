import { isTrue } from '@forklaunch/common';
import { testSchemaEquality } from '@forklaunch/internal';
import { RedisWorkerOptionsSchema as TypeboxRedisWorkerOptionsSchema } from '../schemas/typebox/redisWorker.schema';
import { RedisWorkerOptionsSchema as ZodRedisWorkerOptionsSchema } from '../schemas/zod/redisWorker.schema';
import { RedisWorkerOptions } from '../types/redisWorker.types';

describe('schema equality', () => {
  it('should be equal for bullmq worker', () => {
    expect(
      isTrue(
        testSchemaEquality<RedisWorkerOptions>()(
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
