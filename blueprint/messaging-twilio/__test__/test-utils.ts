import { getEnvVar } from '@forklaunch/common';
import { SmsStatusEnum } from '@forklaunch/implementation-messaging-twilio/enum';
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
    needsRedis: true,
    customEnvVars: {
      TWILIO_ACCOUNT_SID: getEnvVar('TWILIO_ACCOUNT_SID'),
      TWILIO_AUTH_TOKEN: getEnvVar('TWILIO_AUTH_TOKEN'),
      TWILIO_FROM_NUMBER: getEnvVar('TWILIO_FROM_NUMBER')
    }
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
