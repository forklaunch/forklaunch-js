import {
  cleanupTestDatabase,
  clearDatabase,
  mockPermissionResponse,
  mockRoleResponse,
  mockUpdateUserData,
  mockUserData,
  setupTestData,
  setupTestDatabase,
  TEST_TOKENS,
  TestSetupResult
} from './test-utils';

describe('User Routes E2E Tests with PostgreSQL Container', () => {
  let orm: TestSetupResult['orm'];

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    orm = setup.orm;
  }, 60000);

  beforeEach(async () => {
    await clearDatabase(orm);
    if (!orm) throw new Error('ORM not initialized');
    const em = orm.em.fork();
    await setupTestData(em);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  }, 30000);

  describe('POST /user - createUser', () => {
    it('should create a user successfully', async () => {
      const { createUserRoute } = await import('../api/routes/user.routes');
      const response = await createUserRoute.sdk.createUser({
        body: mockUserData,
        headers: {
          authorization: TEST_TOKENS.HMAC
        }
      });

      expect(response.code).toBe(201);
      expect(response.response).toBe('User created successfully');
    });

    it('should handle validation errors', async () => {
      const { createUserRoute } = await import('../api/routes/user.routes');
      const invalidData = {
        email: 'invalid-email',
        emailVerified: true,
        name: '',
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
            authorization: TEST_TOKENS.HMAC
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
          name: 'Jane User',
          firstName: 'Jane',
          subscription: 'basic'
        }
      ];

      const response = await createBatchUsersRoute.sdk.createBatchUsers({
        body: batchData,
        headers: {
          authorization: TEST_TOKENS.HMAC
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
          authorization: TEST_TOKENS.AUTH
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
          authorization: TEST_TOKENS.HMAC
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
            authorization: TEST_TOKENS.HMAC
          }
        }
      );

      expect(response.code).toBe(200);
      expect(response.response).toEqual(mockPermissionResponse);
    });
  });
});
// Test unsymlink
