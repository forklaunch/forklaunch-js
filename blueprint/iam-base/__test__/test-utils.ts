import { EntityManager, MikroORM } from '@mikro-orm/core';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { expect, vi } from 'vitest';

export const MOCK_AUTH_TOKEN = 'Bearer test-token';
export const MOCK_HMAC_TOKEN =
  'HMAC keyId=test-key ts=1234567890 nonce=test-nonce signature=test-signature';

export interface TestSetupResult {
  container: StartedTestContainer;
  orm: MikroORM;
}

export const setupTestDatabase = async (): Promise<TestSetupResult> => {
  const container = await new GenericContainer('postgres:latest')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: 'test_user',
      POSTGRES_PASSWORD: 'test_password',
      POSTGRES_DB: 'test_db'
    })
    .withCommand(['postgres', '-c', 'log_statement=all'])
    .start();

  // Set environment variables
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

  const orm = await MikroORM.init(config);
  await orm.getMigrator().up();

  return { container, orm };
};

export const cleanupTestDatabase = async (
  orm: MikroORM,
  container: StartedTestContainer
): Promise<void> => {
  if (orm) {
    await orm.close();
  }
  if (container) {
    await container.stop({ remove: true, removeVolumes: true });
  }
};

export const clearDatabase = async (orm: MikroORM): Promise<void> => {
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
};

export const setupTestData = async (em: EntityManager) => {
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

  // Create test organization
  const organization = em.create(Organization, {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Organization',
    domain: 'test.com',
    subscription: 'premium',
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create test permission
  const permission = em.create(Permission, {
    id: '123e4567-e89b-12d3-a456-426614174002',
    slug: 'read:users',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create test role
  const role = em.create(Role, {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'admin',
    permissions: [permission],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create test user
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

// Mock data constants
export const mockUserData = {
  email: 'newuser@example.com',
  password: 'password123',
  firstName: 'New',
  lastName: 'User',
  organization: '123e4567-e89b-12d3-a456-426614174001',
  roles: ['123e4567-e89b-12d3-a456-426614174000'],
  phoneNumber: '+1234567890',
  subscription: 'premium'
};

export const mockUpdateUserData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'updated@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  roles: ['123e4567-e89b-12d3-a456-426614174000'],
  phoneNumber: '+0987654321'
};

export const mockOrganizationData = {
  name: 'New Organization',
  domain: 'neworg.com',
  subscription: 'enterprise',
  status: 'active',
  logoUrl: 'https://example.com/logo.png'
};

export const mockUpdateOrganizationData = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Updated Organization',
  domain: 'updated.com',
  subscription: 'basic',
  status: 'inactive',
  logoUrl: 'https://example.com/updated-logo.png'
};

export const mockPermissionData = {
  slug: 'write:users'
};

export const mockUpdatePermissionData = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  slug: 'write:organizations',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const mockRoleData = {
  name: 'editor',
  permissions: ['123e4567-e89b-12d3-a456-426614174002']
};

export const mockUpdateRoleData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'super-admin',
  permissions: ['123e4567-e89b-12d3-a456-426614174002']
};

// Expected response templates
export const mockRoleResponse = [
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

export const mockPermissionResponse = [
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    slug: 'read:users',
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date)
  }
];

export const mockOrganizationResponse = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Test Organization',
  domain: 'test.com',
  subscription: 'premium',
  status: 'active',
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date)
};
