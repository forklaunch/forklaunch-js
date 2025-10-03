import { EntityManager, MikroORM } from '@mikro-orm/core';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';

const MOCK_AUTH_TOKEN = 'Bearer test-token';
const MOCK_HMAC_TOKEN =
  'HMAC keyId=test-key ts=1234567890 nonce=test-nonce signature=test-signature';

describe('User Routes E2E Tests with PostgreSQL Container', () => {
  let container: StartedTestContainer;
  let orm: MikroORM;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:latest')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
        POSTGRES_DB: 'test_db'
      })
      .withCommand(['postgres', '-c', 'log_statement=all'])
      .start();

    process.env.DB_NAME = 'test_db';
    process.env.DB_HOST = container.getHost();
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
    process.env.DB_PORT = container.getMappedPort(5432).toString();
    process.env.HMAC_SECRET_KEY = 'test-secret-key';
    process.env.JWKS_PUBLIC_KEY_URL =
      'http://localhost:3000/.well-known/jwks.json';
    process.env.OTEL_SERVICE_NAME = 'test-service';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    process.env.HOST = 'localhost';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';
    process.env.VERSION = 'v1';
    process.env.DOCS_PATH = '/docs';
    process.env.OTEL_LEVEL = 'info';
    process.env.DOTENV_FILE_PATH = '.env.test';

    const { default: mikroOrmConfig } = await import('../mikro-orm.config');
    const path = await import('path');

    const config = {
      ...mikroOrmConfig,
      dbName: 'test_db',
      host: container.getHost(),
      user: 'test_user',
      password: 'test_password',
      port: container.getMappedPort(5432),
      debug: false,
      migrations: {
        path: path.join(__dirname, '../migrations'),
        glob: '!(*.d).{js,ts}',
        dropTables: true
      }
    };

    orm = await MikroORM.init(config);

    await orm.getMigrator().up();
  }, 60000);

  beforeEach(async () => {
    vi.clearAllMocks();

    const em = orm.em.fork();
    const entities = Object.values(orm.getMetadata().getAll());

    for (const entity of entities.reverse()) {
      try {
        await em.nativeDelete(entity.class, {});
      } catch (error) {
        if (!(error as Error).message?.includes('does not exist')) {
          throw error;
        }
      }
    }

    await em.flush();

    await setupTestData(em);
  });

  const setupTestData = async (em: EntityManager) => {
    const { Permission } = await import(
      '../persistence/entities/permission.entity'
    );
    const { Role } = await import('../persistence/entities/role.entity');
    const { User } = await import('../persistence/entities/user.entity');
    const { Organization } = await import(
      '../persistence/entities/organization.entity'
    );
    const { OrganizationStatus } = await import(
      '../domain/enum/organizationStatus.enum'
    );

    const organization = em.create(Organization, {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Test Organization',
      domain: 'test.com',
      subscription: 'premium',
      status: OrganizationStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const permission = em.create(Permission, {
      id: '123e4567-e89b-12d3-a456-426614174002',
      slug: 'read:users',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const role = em.create(Role, {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'admin',
      permissions: [permission],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    em.create(User, {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      organization: organization,
      roles: [role],
      subscription: 'enterprise',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await em.flush();
  };

  afterAll(async () => {
    if (orm) {
      await orm.close();
    }
    if (container) {
      await container.stop({ remove: true, removeVolumes: true });
    }
  }, 30000);

  const mockUserData = {
    email: 'newuser@example.com',
    password: 'password123',
    firstName: 'New',
    lastName: 'User',
    organization: '123e4567-e89b-12d3-a456-426614174001',
    roles: ['123e4567-e89b-12d3-a456-426614174000'],
    phoneNumber: '+1234567890',
    subscription: 'premium'
  };

  const mockUpdateUserData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'updated@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    roles: ['123e4567-e89b-12d3-a456-426614174000'],
    phoneNumber: '+0987654321'
  };

  const mockRoleResponse = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'admin',
      permissions: [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          slug: 'read:users',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      ],
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date)
    }
  ];

  const mockPermissionResponse = [
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      slug: 'read:users',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date)
    }
  ];

  describe('POST /user - createUser', () => {
    it('should create a user successfully', async () => {
      const { createUserRoute } = await import('../api/routes/user.routes');
      const response = await createUserRoute.sdk.createUser({
        body: mockUserData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(201);
      expect(response.response).toBe('User created successfully');
    });

    it('should handle validation errors', async () => {
      const { createUserRoute } = await import('../api/routes/user.routes');
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
        organization: '',
        roles: []
      };

      try {
        await createUserRoute.sdk.createUser({
          body: invalidData,
          headers: {
            authorization: MOCK_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('POST /user/batch - createBatchUsers', () => {
    it('should create multiple users successfully', async () => {
      const { createBatchUsersRoute } = await import(
        '../api/routes/user.routes'
      );
      const batchData = [
        mockUserData,
        {
          ...mockUserData,
          email: 'test2@example.com',
          firstName: 'Jane',
          subscription: 'basic'
        }
      ];

      const response = await createBatchUsersRoute.sdk.createBatchUsers({
        body: batchData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(201);
      expect(response.response).toBe('Batch users created successfully');
    });
  });

  describe('GET /user/:id - getUser', () => {
    it('should get a user successfully', async () => {
      const { getUserRoute } = await import('../api/routes/user.routes');
      const response = await getUserRoute.sdk.getUser({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        headers: {
          authorization: MOCK_AUTH_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toBeDefined();
    });
  });

  describe('GET /user/batch - getBatchUsers', () => {
    it('should get multiple users successfully', async () => {
      const { getBatchUsersRoute } = await import('../api/routes/user.routes');
      const response = await getBatchUsersRoute.sdk.getBatchUsers({
        query: {
          ids: [
            '123e4567-e89b-12d3-a456-426614174000',
            '456e7890-e89b-12d3-a456-426614174001'
          ]
        }
      });

      expect(response.code).toBe(200);
      expect(Array.isArray(response.response)).toBe(true);
    });
  });

  describe('PUT /user - updateUser', () => {
    it('should update a user successfully', async () => {
      const { updateUserRoute } = await import('../api/routes/user.routes');
      const response = await updateUserRoute.sdk.updateUser({
        body: mockUpdateUserData
      });

      expect(response.code).toBe(200);
      expect(response.response).toBe('User updated successfully');
    });
  });

  describe('PUT /user/batch - updateBatchUsers', () => {
    it('should update multiple users successfully', async () => {
      const { updateBatchUsersRoute } = await import(
        '../api/routes/user.routes'
      );
      const batchUpdateData = [mockUpdateUserData];

      const response = await updateBatchUsersRoute.sdk.updateBatchUsers({
        body: batchUpdateData
      });

      expect(response.code).toBe(200);
      expect(response.response).toBe('Batch users updated successfully');
    });
  });

  describe('DELETE /user/:id - deleteUser', () => {
    it('should delete a user successfully', async () => {
      const { deleteUserRoute } = await import('../api/routes/user.routes');
      const response = await deleteUserRoute.sdk.deleteUser({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      });

      expect(response.code).toBe(200);
      expect(response.response).toBe('User deleted successfully');
    });
  });

  describe('DELETE /user/batch - deleteBatchUsers', () => {
    it('should delete multiple users successfully', async () => {
      const { deleteBatchUsersRoute } = await import(
        '../api/routes/user.routes'
      );
      const response = await deleteBatchUsersRoute.sdk.deleteBatchUsers({
        query: {
          ids: [
            '123e4567-e89b-12d3-a456-426614174000',
            '456e7890-e89b-12d3-a456-426614174001'
          ]
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toBe('Batch users deleted successfully');
    });
  });

  describe('GET /user/:id/surface-roles - surfaceRoles', () => {
    it('should get user roles successfully', async () => {
      const { surfaceRolesRoute } = await import('../api/routes/user.routes');
      const response = await surfaceRolesRoute.sdk.surfaceUserRoles({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toEqual(mockRoleResponse);
    });
  });

  describe('GET /user/:id/surface-permissions - surfacePermissions', () => {
    it('should get user permissions successfully', async () => {
      const { surfacePermissionsRoute } = await import(
        '../api/routes/user.routes'
      );
      const response = await surfacePermissionsRoute.sdk.surfaceUserPermissions(
        {
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          headers: {
            authorization: MOCK_HMAC_TOKEN
          }
        }
      );

      expect(response.code).toBe(200);
      expect(response.response).toEqual(mockPermissionResponse);
    });
  });
});
