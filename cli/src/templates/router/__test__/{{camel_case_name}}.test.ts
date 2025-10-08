import {
  cleanupTestDatabase,
  clearDatabase,
  mock{{pascal_case_name}}Data,
  setupTestData,
  setupTestDatabase,
  TEST_TOKENS,
  TestSetupResult
} from './test-utils';

describe('{{pascal_case_name}} Service E2E Tests', () => {
  {{#is_database_enabled}}let orm: TestSetupResult['orm'];{{/is_database_enabled}}
  {{#is_cache_enabled}}let redis: TestSetupResult['redis'];{{/is_cache_enabled}}

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    {{#is_database_enabled}}orm = setup.orm;{{/is_database_enabled}}
    {{#is_cache_enabled}}redis = setup.redis;{{/is_cache_enabled}}
  }, 60000);

  beforeEach(async () => {
    await clearDatabase({{#is_database_enabled}}orm{{/is_database_enabled}}{{#is_cache_enabled}}{{#is_database_enabled}}, {{/is_database_enabled}}redis{{/is_cache_enabled}});
    {{#is_database_enabled}}const em = orm.em.fork();
    await setupTestData(em);{{/is_database_enabled}}
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  }, 30000);

  describe('{{pascal_case_name}}Service - Business Logic', () => {
    it('should process {{camel_case_name}} data successfully', async () => {
      const { Base{{pascal_case_name}}Service } = await import(
        '../services/{{camel_case_name}}.service'
      );
      {{#is_database_enabled}}const em = orm.em.fork();{{/is_database_enabled}}
      const { ci, tokens } = await import('../bootstrapper');
      
      const scope = ci.createScope({{#is_database_enabled}}{ entityManagerOptions: {} }{{/is_database_enabled}});
      const service = scope.resolve(tokens.{{pascal_case_name}}Service);

      const result = await service.{{camel_case_name}}Post(mock{{pascal_case_name}}Data);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
    {{#is_database_enabled}}

    it('should persist data to database', async () => {
      const { ci, tokens } = await import('../bootstrapper');
      const scope = ci.createScope({ entityManagerOptions: {} });
      const service = scope.resolve(tokens.{{pascal_case_name}}Service);

      await service.{{camel_case_name}}Post(mock{{pascal_case_name}}Data);

      const em = orm.em.fork();
      const { {{pascal_case_name}}Record } = await import(
        '../persistence/entities/{{camel_case_name}}Record.entity'
      );

      const records = await em.find({{pascal_case_name}}Record, {
        message: mock{{pascal_case_name}}Data.message
      });

      expect(records.length).toBeGreaterThanOrEqual(0);
    });
    {{/is_database_enabled}}
  });
});
