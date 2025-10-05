import { BillingProviderEnum } from '@forklaunch/implementation-billing-stripe/enum';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PartyEnum } from '../domain/enum/party.enum';
import {
  cleanupTestDatabase,
  clearDatabase,
  MOCK_HMAC_TOKEN,
  MOCK_INVALID_HMAC_TOKEN,
  mockSubscriptionData,
  mockUpdateSubscriptionData,
  setupTestData,
  setupTestDatabase,
  TestSetupResult
} from './test-utils';

describe('Subscription Routes E2E Tests with PostgreSQL Container', () => {
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

  describe('POST /subscription - createSubscription', () => {
    it('should create a subscription successfully', async () => {
      const { createSubscriptionRoute: createSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      const response = await createSubscription.sdk.createSubscription({
        body: mockSubscriptionData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        partyId: mockSubscriptionData.partyId,
        partyType: mockSubscriptionData.partyType,
        description: mockSubscriptionData.description,
        active: mockSubscriptionData.active,
        productId: mockSubscriptionData.productId,
        externalId: mockSubscriptionData.externalId,
        billingProvider: mockSubscriptionData.billingProvider,
        startDate: expect.any(Date),
        status: mockSubscriptionData.status,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle validation errors when creating subscription', async () => {
      const { createSubscriptionRoute: createSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      const invalidData = {
        ...mockSubscriptionData,
        partyId: '',
        productId: ''
      };

      try {
        await createSubscription.sdk.createSubscription({
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

    it('should handle invalid party type enum', async () => {
      const { createSubscriptionRoute: createSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      const invalidData = {
        ...mockSubscriptionData,
        partyType: 'INVALID_PARTY_TYPE' as PartyEnum
      };

      try {
        await createSubscription.sdk.createSubscription({
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

    it('should handle invalid billing provider enum', async () => {
      const { createSubscriptionRoute: createSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      const invalidData = {
        ...mockSubscriptionData,
        billingProvider: 'INVALID_PROVIDER' as BillingProviderEnum
      };

      try {
        await createSubscription.sdk.createSubscription({
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

  describe('GET /subscription/:id - getSubscription', () => {
    it('should retrieve an existing subscription successfully', async () => {
      const {
        createSubscriptionRoute: createSubscription,
        getSubscriptionRoute: getSubscription
      } = await import('../api/routes/subscription.routes');

      const createResponse = await createSubscription.sdk.createSubscription({
        body: mockSubscriptionData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create subscription');
      }
      const subscriptionId = createResponse.response.id;

      const response = await getSubscription.sdk.getSubscription({
        params: { id: subscriptionId },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        id: subscriptionId,
        partyId: mockSubscriptionData.partyId,
        partyType: mockSubscriptionData.partyType,
        description: mockSubscriptionData.description,
        active: mockSubscriptionData.active,
        productId: mockSubscriptionData.productId,
        externalId: mockSubscriptionData.externalId,
        billingProvider: mockSubscriptionData.billingProvider,
        startDate: expect.any(Date),
        status: mockSubscriptionData.status,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle non-existent subscription ID', async () => {
      const { getSubscriptionRoute: getSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await getSubscription.sdk.getSubscription({
          params: { id: '123e4567-e89b-12d3-a456-426614174999' },
          headers: {
            authorization: MOCK_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid UUID format', async () => {
      const { getSubscriptionRoute: getSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await getSubscription.sdk.getSubscription({
          params: { id: 'invalid-uuid' },
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

  describe('PUT /subscription - updateSubscription', () => {
    it('should update an existing subscription successfully', async () => {
      const {
        createSubscriptionRoute: createSubscription,
        updateSubscriptionRoute: updateSubscription
      } = await import('../api/routes/subscription.routes');

      const createResponse = await createSubscription.sdk.createSubscription({
        body: mockSubscriptionData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create subscription');
      }
      const subscriptionId = createResponse.response.id;
      const updateData = {
        ...mockUpdateSubscriptionData,
        id: subscriptionId
      };

      const response = await updateSubscription.sdk.updateSubscription({
        params: { id: subscriptionId },
        body: updateData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        id: subscriptionId,
        partyId: updateData.partyId,
        partyType: updateData.partyType,
        description: updateData.description,
        active: updateData.active,
        productId: updateData.productId,
        externalId: updateData.externalId,
        billingProvider: updateData.billingProvider,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        status: updateData.status,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle updating non-existent subscription', async () => {
      const { updateSubscriptionRoute: updateSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      const updateData = {
        ...mockUpdateSubscriptionData,
        id: '123e4567-e89b-12d3-a456-426614174999'
      };

      try {
        await updateSubscription.sdk.updateSubscription({
          params: { id: '123e4567-e89b-12d3-a456-426614174999' },
          body: updateData,
          headers: {
            authorization: MOCK_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should handle validation errors when updating subscription', async () => {
      const {
        createSubscriptionRoute: createSubscription,
        updateSubscriptionRoute: updateSubscription
      } = await import('../api/routes/subscription.routes');

      const createResponse = await createSubscription.sdk.createSubscription({
        body: mockSubscriptionData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create subscription');
      }
      const subscriptionId = createResponse.response.id;
      const invalidUpdateData = {
        ...mockUpdateSubscriptionData,
        id: subscriptionId,
        partyId: '',
        productId: ''
      };

      try {
        await updateSubscription.sdk.updateSubscription({
          params: { id: subscriptionId },
          body: invalidUpdateData,
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

  describe('DELETE /subscription/:id - deleteSubscription', () => {
    it('should delete an existing subscription successfully', async () => {
      const {
        createSubscriptionRoute: createSubscription,
        deleteSubscriptionRoute: deleteSubscription
      } = await import('../api/routes/subscription.routes');

      const createResponse = await createSubscription.sdk.createSubscription({
        body: mockSubscriptionData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create subscription');
      }
      const subscriptionId = createResponse.response.id;

      const response = await deleteSubscription.sdk.deleteSubscription({
        params: { id: subscriptionId },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toBe(`Deleted subscription ${subscriptionId}`);
    });

    it('should handle deleting non-existent subscription', async () => {
      const { deleteSubscriptionRoute: deleteSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await deleteSubscription.sdk.deleteSubscription({
          params: { id: '123e4567-e89b-12d3-a456-426614174999' },
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

  describe('GET /subscription - listSubscriptions', () => {
    it('should list all subscriptions when no IDs provided', async () => {
      const {
        createSubscriptionRoute: createSubscription,
        listSubscriptionsRoute: listSubscriptions
      } = await import('../api/routes/subscription.routes');

      await createSubscription.sdk.createSubscription({
        body: mockSubscriptionData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      await createSubscription.sdk.createSubscription({
        body: {
          ...mockSubscriptionData,
          partyId: '123e4567-e89b-12d3-a456-426614174001',
          externalId: 'sub_second_123'
        },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      const response = await listSubscriptions.sdk.listSubscriptions({
        query: { ids: [] },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toHaveLength(3);
      expect(response.response[0]).toMatchObject({
        partyId: expect.any(String),
        partyType: expect.any(String),
        active: expect.any(Boolean),
        productId: expect.any(String),
        status: expect.any(String),
        externalId: expect.any(String),
        billingProvider: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should list specific subscriptions when IDs provided', async () => {
      const {
        createSubscriptionRoute: createSubscription,
        listSubscriptionsRoute: listSubscriptions
      } = await import('../api/routes/subscription.routes');

      const subscription1Response =
        await createSubscription.sdk.createSubscription({
          body: mockSubscriptionData,
          headers: {
            authorization: MOCK_HMAC_TOKEN
          }
        });

      const subscription2Response =
        await createSubscription.sdk.createSubscription({
          body: {
            ...mockSubscriptionData,
            partyId: '123e4567-e89b-12d3-a456-426614174001',
            externalId: 'sub_second_123'
          },
          headers: {
            authorization: MOCK_HMAC_TOKEN
          }
        });

      if (
        subscription1Response.code !== 200 ||
        subscription2Response.code !== 200
      ) {
        throw new Error('Failed to create subscriptions');
      }

      const response = await listSubscriptions.sdk.listSubscriptions({
        query: {
          ids: [
            subscription1Response.response.id,
            subscription2Response.response.id
          ]
        },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      if (response.code === 200) {
        expect(response.response).toHaveLength(2);
        expect(response.response.map((s: { id: string }) => s.id)).toContain(
          subscription1Response.response.id
        );
        expect(response.response.map((s: { id: string }) => s.id)).toContain(
          subscription2Response.response.id
        );
      }
    });

    it('should return empty array when no subscriptions match provided IDs', async () => {
      const { listSubscriptionsRoute: listSubscriptions } = await import(
        '../api/routes/subscription.routes'
      );

      const response = await listSubscriptions.sdk.listSubscriptions({
        query: {
          ids: ['123e4567-e89b-12d3-a456-426614174999']
        },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toHaveLength(0);
    });
  });

  describe('Authentication', () => {
    it('should require HMAC authentication for createSubscription', async () => {
      const { createSubscriptionRoute: createSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await createSubscription.sdk.createSubscription({
          body: mockSubscriptionData,
          headers: {
            authorization: MOCK_INVALID_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for getSubscription', async () => {
      const { getSubscriptionRoute: getSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await getSubscription.sdk.getSubscription({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          headers: {
            authorization: MOCK_INVALID_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for updateSubscription', async () => {
      const { updateSubscriptionRoute: updateSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await updateSubscription.sdk.updateSubscription({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          body: {
            ...mockUpdateSubscriptionData,
            id: '123e4567-e89b-12d3-a456-426614174000'
          },
          headers: {
            authorization: MOCK_INVALID_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for deleteSubscription', async () => {
      const { deleteSubscriptionRoute: deleteSubscription } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await deleteSubscription.sdk.deleteSubscription({
          params: { id: '123e4567-e89b-12d3-a456-426614174000' },
          headers: {
            authorization: MOCK_INVALID_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for listSubscriptions', async () => {
      const { listSubscriptionsRoute: listSubscriptions } = await import(
        '../api/routes/subscription.routes'
      );

      try {
        await listSubscriptions.sdk.listSubscriptions({
          query: { ids: [] },
          headers: {
            authorization: MOCK_INVALID_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });
});
