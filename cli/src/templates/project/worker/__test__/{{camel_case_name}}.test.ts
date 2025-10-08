import {
  cleanupTestDatabase,
  clearDatabase,
  mock{{pascal_case_name}}Data,
  setupTestData,
  setupTestDatabase,
  TEST_TOKENS,
  TestSetupResult
} from './test-utils';

describe('{{pascal_case_name}} Worker E2E Tests', () => {
  let orm: TestSetupResult['orm'];
  {{#is_cache_enabled}}let redis: TestSetupResult['redis'];{{/is_cache_enabled}}

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    orm = setup.orm;
    {{#is_cache_enabled}}redis = setup.redis;{{/is_cache_enabled}}
  }, 60000);

  beforeEach(async () => {
    await clearDatabase(orm{{#is_cache_enabled}}, redis{{/is_cache_enabled}});
    const em = orm.em.fork();
    await setupTestData(em);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  }, 30000);

  describe('GET /{{kebab_case_name}}/:id - {{camel_case_name}}Get', () => {
    it('should get a {{camel_case_name}} event record successfully', async () => {
      const { {{camel_case_name}}GetRoute } = await import(
        '../api/routes/{{camel_case_name}}.routes'
      );
      const response = await {{camel_case_name}}GetRoute.sdk.{{lowercase_name}}get({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        headers: {
          authorization: TEST_TOKENS.HMAC
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toBeDefined();
      if (response.code === 200) {
        expect(response.response.message).toBe('{{pascal_case_name}}');
        expect(response.response.processed).toBe(false);
        expect(response.response.retryCount).toBe(0);
      }
    });

    it('should require HMAC authentication', async () => {
      const { {{camel_case_name}}GetRoute } = await import(
        '../api/routes/{{camel_case_name}}.routes'
      );

      try {
        await {{camel_case_name}}GetRoute.sdk.{{lowercase_name}}get({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          headers: {
            authorization: TEST_TOKENS.HMAC_INVALID
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('POST /{{kebab_case_name}} - {{camel_case_name}}Post', () => {
    it.skip('should create a {{camel_case_name}} worker job successfully', async () => {
      const { {{camel_case_name}}PostRoute } = await import(
        '../api/routes/{{camel_case_name}}.routes'
      );
      const response = await {{camel_case_name}}PostRoute.sdk.{{lowercase_name}}post({
        body: mock{{pascal_case_name}}Data,
        headers: {
          authorization: TEST_TOKENS.HMAC
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toBeDefined();
      if (response.code === 200) {
        expect(response.response.message).toBe('New test message');
        expect(response.response.processed).toBe(false);
        expect(response.response.retryCount).toBe(0);
      }
    });

    it('should handle validation errors when creating worker job', async () => {
      const { {{camel_case_name}}PostRoute } = await import(
        '../api/routes/{{camel_case_name}}.routes'
      );
      const invalidData = {
        message: ''
      };

      try {
        await {{camel_case_name}}PostRoute.sdk.{{lowercase_name}}post({
          body: invalidData,
          headers: {
            authorization: TEST_TOKENS.HMAC
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication', async () => {
      const { {{camel_case_name}}PostRoute } = await import(
        '../api/routes/{{camel_case_name}}.routes'
      );

      try {
        await {{camel_case_name}}PostRoute.sdk.{{lowercase_name}}post({
          body: mock{{pascal_case_name}}Data,
          headers: {
            authorization: TEST_TOKENS.HMAC_INVALID
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it.skip('should enqueue jobs to worker queue', async () => {
      const { {{camel_case_name}}PostRoute } = await import(
        '../api/routes/{{camel_case_name}}.routes'
      );
      const response = await {{camel_case_name}}PostRoute.sdk.{{lowercase_name}}post({
        body: mock{{pascal_case_name}}Data,
        headers: {
          authorization: TEST_TOKENS.HMAC
        }
      });

      expect(response.code).toBe(200);
      if (response.code === 200) {
        expect(response.response.message).toBe(mock{{pascal_case_name}}Data.message);
        expect(response.response.processed).toBe(false);
        expect(response.response.retryCount).toBe(0);
      }

      const em = orm.em.fork();
      const { {{pascal_case_name}}EventRecord } = await import(
        '../persistence/entities/{{camel_case_name}}EventRecord.entity'
      );

      const records = await em.find({{pascal_case_name}}EventRecord, {
        message: mock{{pascal_case_name}}Data.message
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
    });
  });
});
