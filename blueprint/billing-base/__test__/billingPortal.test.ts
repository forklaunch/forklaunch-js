import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanupTestDatabase,
  clearDatabase,
  MOCK_AUTH_TOKEN,
  mockBillingPortalData,
  setupTestData,
  setupTestDatabase,
  TestSetupResult
} from './test-utils';

describe('BillingPortal Routes E2E Tests with PostgreSQL Container', () => {
  let container: TestSetupResult['container'];
  let redisContainer: TestSetupResult['redisContainer'];
  let orm: TestSetupResult['orm'];
  let redis: TestSetupResult['redis'];

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    container = setup.container;
    redisContainer = setup.redisContainer;
    orm = setup.orm;
    redis = setup.redis;
  }, 60000);

  beforeEach(async () => {
    await clearDatabase(orm, redis);
    const em = orm.em.fork();
    await setupTestData(em);
  });

  afterAll(async () => {
    await cleanupTestDatabase(orm, container, redisContainer, redis);
  }, 30000);

  describe('POST /billing-portal - createBillingPortalSession', () => {
    it('should create a billing portal session successfully', async () => {
      const { createBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      const response =
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: mockBillingPortalData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        customerId: mockBillingPortalData.customerId,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle validation errors when creating billing portal session', async () => {
      const { createBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      const invalidData = {
        ...mockBillingPortalData,
        customerId: '',
        returnUrl: 'invalid-url'
      };

      try {
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: invalidData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid billing provider enum', async () => {
      const { createBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      const invalidData = {
        ...mockBillingPortalData,
        billingProvider: 'INVALID_PROVIDER'
      };

      try {
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: invalidData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('GET /billing-portal/:id - getBillingPortalSession', () => {
    it('should retrieve an existing billing portal session successfully', async () => {
      const { createBillingPortalRoute, getBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      const createResponse =
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: mockBillingPortalData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create billing portal');
      }
      const portalId = createResponse.response.id;

      const response = await getBillingPortalRoute.sdk.getBillingPortalSession({
        params: { id: portalId },
        headers: {
          authorization: MOCK_AUTH_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        id: expect.any(String),
        customerId: mockBillingPortalData.customerId,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle non-existent billing portal session ID', async () => {
      const { getBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      try {
        await getBillingPortalRoute.sdk.getBillingPortalSession({
          params: { id: '123e4567-e89b-12d3-a456-426614174999' },
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid UUID format', async () => {
      const { getBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      try {
        await getBillingPortalRoute.sdk.getBillingPortalSession({
          params: { id: 'invalid-uuid' },
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('PUT /billing-portal/:id - updateBillingPortalSession', () => {
    it('should update an existing billing portal session successfully', async () => {
      const { createBillingPortalRoute, updateBillingPortalRoute } =
        await import('../api/routes/billingPortal.routes');

      const createResponse =
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: mockBillingPortalData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create billing portal');
      }
      const portalId = createResponse.response.id;
      const updateData = {
        id: portalId,
        customerId: mockBillingPortalData.customerId,
        expiresAt: mockBillingPortalData.expiresAt
      };

      const response =
        await updateBillingPortalRoute.sdk.updateBillingPortalSession({
          params: { id: portalId },
          body: updateData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        id: expect.any(String)
      });
    });

    it('should handle updating non-existent billing portal session', async () => {
      const { updateBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      const updateData = {
        id: '123e4567-e89b-12d3-a456-426614174999',
        customerId: 'cus_updated_123',
        externalId: 'portal_updated_123',
        billingProvider: 'STRIPE'
      };

      try {
        await updateBillingPortalRoute.sdk.updateBillingPortalSession({
          params: { id: '123e4567-e89b-12d3-a456-426614174999' },
          body: updateData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should handle validation errors when updating billing portal session', async () => {
      const { createBillingPortalRoute, updateBillingPortalRoute } =
        await import('../api/routes/billingPortal.routes');

      const createResponse =
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: mockBillingPortalData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create billing portal');
      }
      const portalId = createResponse.response.id;
      const invalidUpdateData = {
        id: portalId
      };

      try {
        await updateBillingPortalRoute.sdk.updateBillingPortalSession({
          params: { id: portalId },
          body: invalidUpdateData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('DELETE /billing-portal/:id - expireBillingPortalSession', () => {
    it('should expire an existing billing portal session successfully', async () => {
      const { createBillingPortalRoute, expireBillingPortalRoute } =
        await import('../api/routes/billingPortal.routes');

      const createResponse =
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: mockBillingPortalData,
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create billing portal');
      }
      const portalId = createResponse.response.id;

      const response =
        await expireBillingPortalRoute.sdk.expireBillingPortalSession({
          params: { id: portalId },
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });

      expect(response.code).toBe(200);
      expect(response.response).toBe(
        `Expired billing portal session ${portalId}`
      );
    });

    it('should handle expiring non-existent billing portal session', async () => {
      const { expireBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      try {
        await expireBillingPortalRoute.sdk.expireBillingPortalSession({
          params: { id: '123e4567-e89b-12d3-a456-426614174999' },
          headers: {
            authorization: MOCK_AUTH_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Authentication', () => {
    it('should require HMAC authentication for createBillingPortalSession', async () => {
      const { createBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      try {
        await createBillingPortalRoute.sdk.createBillingPortalSession({
          body: mockBillingPortalData,
          headers: {
            authorization: 'Bearer invalid-token'
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for getBillingPortalSession', async () => {
      const { getBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      try {
        await getBillingPortalRoute.sdk.getBillingPortalSession({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          headers: {
            authorization: 'Bearer invalid-token'
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for updateBillingPortalSession', async () => {
      const { updateBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      try {
        await updateBillingPortalRoute.sdk.updateBillingPortalSession({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          body: {
            id: '123e4567-e89b-12d3-a456-426614174000'
          },
          headers: {
            authorization: 'Bearer invalid-token'
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for expireBillingPortalSession', async () => {
      const { expireBillingPortalRoute } = await import(
        '../api/routes/billingPortal.routes'
      );

      try {
        await expireBillingPortalRoute.sdk.expireBillingPortalSession({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          headers: {
            authorization: 'Bearer invalid-token'
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });
});
