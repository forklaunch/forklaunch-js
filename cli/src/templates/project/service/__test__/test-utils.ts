import { getEnvVar } from '@forklaunch/common';
import {
  BlueprintTestHarness,
  clearTestDatabase,
  DatabaseType,
  TEST_TOKENS,
  TestSetupResult
} from '@forklaunch/testing';
{{#is_database_enabled}}import { EntityManager, MikroORM } from '@mikro-orm/core';{{/is_database_enabled}}
import dotenv from 'dotenv';
{{#is_cache_enabled}}import Redis from 'ioredis';{{/is_cache_enabled}}
import * as path from 'path';

export { TEST_TOKENS, TestSetupResult };

let harness: BlueprintTestHarness;

dotenv.config({ path: path.join(__dirname, '../.env.test') });

export const setupTestDatabase = async (): Promise<TestSetupResult> => {
  harness = new BlueprintTestHarness({
    {{#is_database_enabled}}getConfig: async () => {
      const { default: config } = await import('../mikro-orm.config');
      return config;
    },
    databaseType: getEnvVar('DATABASE_TYPE') as DatabaseType,
    useMigrations: false,
    {{/is_database_enabled}}{{^is_database_enabled}}getConfig: async () => ({}),
    {{/is_database_enabled}}needsRedis: {{#is_cache_enabled}}true{{/is_cache_enabled}}{{^is_cache_enabled}}false{{/is_cache_enabled}},
    customEnvVars: {
      PROTOCOL: 'http',
      HOST: 'localhost',
      PORT: '3000',
      VERSION: 'v1',
      DOCS_PATH: '/docs',
      OTEL_SERVICE_NAME: 'test-service',
      OTEL_LEVEL: 'info',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318'{{#is_cache_enabled}},
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'{{/is_cache_enabled}}{{#is_kafka_enabled}},
      KAFKA_BROKERS: 'localhost:9092',
      KAFKA_CLIENT_ID: 'test-client',
      KAFKA_GROUP_ID: 'test-group'{{/is_kafka_enabled}}{{#is_worker}},
      QUEUE_NAME: 'test-queue'{{/is_worker}}{{#is_s3_enabled}},
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key',
      S3_BUCKET: 'test-bucket',
      S3_URL: 'http://localhost:9000'{{/is_s3_enabled}}
    }
  });

  return await harness.setup();
};

export const cleanupTestDatabase = async (): Promise<void> => {
  if (harness) {
    await harness.cleanup();
  }
};

export const clearDatabase = async (
  {{#is_database_enabled}}orm: MikroORM{{/is_database_enabled}}{{#is_cache_enabled}}{{#is_database_enabled}},
  {{/is_database_enabled}}redis?: Redis{{/is_cache_enabled}}
): Promise<void> => {
  await clearTestDatabase({{#is_database_enabled}}orm{{/is_database_enabled}}{{^is_database_enabled}}undefined as any{{/is_database_enabled}}{{#is_cache_enabled}}, redis{{/is_cache_enabled}});
};
{{#is_database_enabled}}

export const setupTestData = async (em: EntityManager) => {
  const { {{pascal_case_name}}Record } = await import(
    '../persistence/entities/{{camel_case_name}}Record.entity'
  );

  em.create({{pascal_case_name}}Record, {
    id: '123e4567-e89b-12d3-a456-426614174000',
    message: 'Test message',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await em.flush();
};
{{/is_database_enabled}}{{^is_database_enabled}}

export const setupTestData = async () => {
  // No database configured, no test data to set up
};
{{/is_database_enabled}}

export const mock{{pascal_case_name}}Data = {
  message: 'New test message'
};
