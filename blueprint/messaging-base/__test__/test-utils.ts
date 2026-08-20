import { getEnvVar } from '@forklaunch/common';
import {
  BlueprintTestHarness,
  clearTestDatabase,
  DatabaseType,
  TEST_TOKENS,
  TestSetupResult
} from '@forklaunch/testing';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import * as path from 'path';

export { TEST_TOKENS, TestSetupResult };

let harness: BlueprintTestHarness;

dotenv.config({ path: path.join(__dirname, '../.env.test') });

export const setupTestDatabase = async (): Promise<TestSetupResult> => {
  harness = new BlueprintTestHarness({
    getConfig: async () => {
      const { default: config } = await import('../mikro-orm.config');
      return config;
    },
    databaseType: getEnvVar('DATABASE_TYPE') as DatabaseType,
    useMigrations: false,
    needsRedis: true
  });

  return await harness.setup();
};

export const cleanupTestDatabase = async (): Promise<void> => {
  if (harness) {
    await harness.cleanup();
  }
};

export const clearDatabase = async (options?: {
  orm?: MikroORM;
  redis?: Redis;
}): Promise<void> => {
  await clearTestDatabase(options);
};

export const setupTestData = async (em: EntityManager) => {
  const { SmsRecord } = await import(
    '../persistence/entities/smsRecord.entity'
  );
  const { SmsStatusEnum } = await import(
    '@forklaunch/implementation-messaging-base/enum'
  );

  em.create(SmsRecord, {
    id: '123e4567-e89b-12d3-a456-426614174001',
    to: '+15555550100',
    body: 'A seeded sms record',
    status: SmsStatusEnum.SENT,
    providerMessageId: 'SM_test_123',
    error: null,
    metadata: null
  });

  await em.flush();
};

export const mockSendSmsData = {
  to: '+15555550199',
  body: 'Hello from the test suite',
  metadata: {
    campaign: 'test'
  }
};
