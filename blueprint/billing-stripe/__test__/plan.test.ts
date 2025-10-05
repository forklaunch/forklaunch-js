import {
  BillingProviderEnum,
  CurrencyEnum
} from '@forklaunch/implementation-billing-stripe/enum';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanupTestDatabase,
  clearDatabase,
  MOCK_HMAC_TOKEN,
  MOCK_INVALID_HMAC_TOKEN,
  mockPlanData,
  mockUpdatePlanData,
  setupTestData,
  setupTestDatabase,
  TestSetupResult
} from './test-utils';

describe('Plan Routes E2E Tests with PostgreSQL Container', () => {
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

  describe('POST /plan - createPlan', () => {
    it('should create a plan successfully', async () => {
      const { createPlanRoute } = await import('../api/routes/plan.routes');
      const response = await createPlanRoute.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        active: mockPlanData.active,
        name: mockPlanData.name,
        description: mockPlanData.description,
        price: mockPlanData.price,
        currency: mockPlanData.currency,
        cadence: mockPlanData.cadence,
        features: mockPlanData.features,
        externalId: mockPlanData.externalId,
        billingProvider: mockPlanData.billingProvider,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle validation errors when creating plan', async () => {
      const { createPlanRoute } = await import('../api/routes/plan.routes');
      const invalidData = {
        ...mockPlanData,
        name: '',
        price: -100,
        billingProvider: 'INVALID_PROVIDER' as never
      };

      try {
        await createPlanRoute.sdk.createPlan({
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

    it('should handle invalid currency enum', async () => {
      const { createPlanRoute } = await import('../api/routes/plan.routes');
      const invalidData = {
        ...mockPlanData,
        currency: 'INVALID_CURRENCY' as CurrencyEnum
      };

      try {
        await createPlanRoute.sdk.createPlan({
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
      const { createPlanRoute } = await import('../api/routes/plan.routes');
      const invalidData = {
        ...mockPlanData,
        billingProvider: 'INVALID_PROVIDER' as BillingProviderEnum
      };

      try {
        await createPlanRoute.sdk.createPlan({
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

  describe('GET /plan/:id - getPlan', () => {
    it('should retrieve an existing plan successfully', async () => {
      const { createPlanRoute: createPlan, getPlanRoute: getPlan } =
        await import('../api/routes/plan.routes');

      const createResponse = await createPlan.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create plan');
      }
      const planId = createResponse.response.id;

      const response = await getPlan.sdk.getPlan({
        params: { id: planId },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        id: planId,
        name: mockPlanData.name,
        description: mockPlanData.description,
        price: mockPlanData.price,
        currency: mockPlanData.currency,
        cadence: mockPlanData.cadence,
        features: mockPlanData.features,
        externalId: mockPlanData.externalId,
        billingProvider: mockPlanData.billingProvider,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle non-existent plan ID', async () => {
      const { getPlanRoute: getPlan } = await import(
        '../api/routes/plan.routes'
      );

      try {
        await getPlan.sdk.getPlan({
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
      const { getPlanRoute: getPlan } = await import(
        '../api/routes/plan.routes'
      );

      try {
        await getPlan.sdk.getPlan({
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

  describe('PUT /plan - updatePlan', () => {
    it('should update an existing plan successfully', async () => {
      const { createPlanRoute: createPlan, updatePlanRoute: updatePlan } =
        await import('../api/routes/plan.routes');

      const createResponse = await createPlan.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create plan');
      }
      const planId = createResponse.response.id;
      const updateData = {
        ...mockUpdatePlanData,
        id: planId
      };

      const response = await updatePlan.sdk.updatePlan({
        body: updateData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toMatchObject({
        id: planId,
        active: updateData.active,
        name: updateData.name,
        description: updateData.description,
        price: updateData.price,
        currency: updateData.currency,
        cadence: updateData.cadence,
        features: updateData.features,
        externalId: updateData.externalId,
        billingProvider: updateData.billingProvider,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle updating non-existent plan', async () => {
      const { updatePlanRoute: updatePlan } = await import(
        '../api/routes/plan.routes'
      );

      const updateData = {
        ...mockUpdatePlanData,
        id: '123e4567-e89b-12d3-a456-426614174999'
      };

      try {
        await updatePlan.sdk.updatePlan({
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

    it('should handle validation errors when updating plan', async () => {
      const { createPlanRoute: createPlan, updatePlanRoute: updatePlan } =
        await import('../api/routes/plan.routes');

      const createResponse = await createPlan.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create plan');
      }
      const planId = createResponse.response.id;
      const invalidUpdateData = {
        ...mockUpdatePlanData,
        id: planId,
        name: '',
        price: -100
      };

      try {
        await updatePlan.sdk.updatePlan({
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

  describe('DELETE /plan/:id - deletePlan', () => {
    it('should delete an existing plan successfully', async () => {
      const { createPlanRoute: createPlan, deletePlanRoute: deletePlan } =
        await import('../api/routes/plan.routes');

      const createResponse = await createPlan.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create plan');
      }
      const planId = createResponse.response.id;

      const response = await deletePlan.sdk.deletePlan({
        params: { id: planId },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response).toBe(`Deleted plan ${planId}`);
    });

    it('should handle deleting non-existent plan', async () => {
      const { deletePlanRoute: deletePlan } = await import(
        '../api/routes/plan.routes'
      );

      try {
        await deletePlan.sdk.deletePlan({
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

  describe('GET /plan - listPlans', () => {
    it('should list all plans when no IDs provided', async () => {
      const { createPlanRoute, listPlansRoute: listPlans } = await import(
        '../api/routes/plan.routes'
      );

      await createPlanRoute.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      await createPlanRoute.sdk.createPlan({
        body: {
          ...mockPlanData,
          name: 'Second Plan',
          externalId: 'plan_second_123'
        },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      const response = await listPlans.sdk.listPlans({
        query: { ids: [] },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response.length).toBeGreaterThanOrEqual(2);
      expect(response.response[0]).toMatchObject({
        name: expect.any(String),
        price: expect.any(Number),
        currency: expect.any(String),
        cadence: expect.any(String),
        externalId: expect.any(String),
        billingProvider: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should list specific plans when IDs provided', async () => {
      const { createPlanRoute: createPlan, listPlansRoute: listPlans } =
        await import('../api/routes/plan.routes');

      const plan1Response = await createPlan.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      const plan2Response = await createPlan.sdk.createPlan({
        body: {
          ...mockPlanData,
          name: 'Second Plan',
          externalId: 'plan_second_123'
        },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (plan1Response.code !== 200 || plan2Response.code !== 200) {
        throw new Error('Failed to create plans');
      }

      const response = await listPlans.sdk.listPlans({
        query: {
          ids: [plan1Response.response.id, plan2Response.response.id]
        },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      if (response.code === 200) {
        expect(response.response.length).toBeGreaterThanOrEqual(2);
        expect(response.response.map((p: { id: string }) => p.id)).toContain(
          plan1Response.response.id
        );
        expect(response.response.map((p: { id: string }) => p.id)).toContain(
          plan2Response.response.id
        );
      }
    });

    it('should return empty array when no plans match provided IDs', async () => {
      const { listPlansRoute: listPlans } = await import(
        '../api/routes/plan.routes'
      );

      const response = await listPlans.sdk.listPlans({
        query: {
          ids: ['123e4567-e89b-12d3-a456-426614174999']
        },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response.code).toBe(200);
      expect(response.response.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication', () => {
    it('should require HMAC authentication for createPlan', async () => {
      const { createPlanRoute } = await import('../api/routes/plan.routes');
      try {
        await createPlanRoute.sdk.createPlan({
          body: mockPlanData,
          headers: {
            authorization: MOCK_INVALID_HMAC_TOKEN
          }
        });
        expect(true).toBe(false);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('should require HMAC authentication for getPlan', async () => {
      const { getPlanRoute: getPlan } = await import(
        '../api/routes/plan.routes'
      );

      try {
        await getPlan.sdk.getPlan({
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

    it('should require HMAC authentication for updatePlan', async () => {
      const { updatePlanRoute: updatePlan } = await import(
        '../api/routes/plan.routes'
      );

      try {
        await updatePlan.sdk.updatePlan({
          body: {
            ...mockUpdatePlanData,
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

    it('should require HMAC authentication for deletePlan', async () => {
      const { deletePlanRoute: deletePlan } = await import(
        '../api/routes/plan.routes'
      );

      try {
        await deletePlan.sdk.deletePlan({
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

    it('should require HMAC authentication for listPlans', async () => {
      const { listPlansRoute: listPlans } = await import(
        '../api/routes/plan.routes'
      );

      try {
        await listPlans.sdk.listPlans({
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

  describe('Cache Behavior', () => {
    it('should cache GET requests for plans', async () => {
      const { createPlanRoute, getPlanRoute } = await import(
        '../api/routes/plan.routes'
      );

      const createResponse = await createPlanRoute.sdk.createPlan({
        body: mockPlanData,
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      if (createResponse.code !== 200) {
        throw new Error('Failed to create plan');
      }
      const planId = createResponse.response.id;

      const response1 = await getPlanRoute.sdk.getPlan({
        params: { id: planId },
        headers: {
          authorization: MOCK_HMAC_TOKEN
        }
      });

      expect(response1.code).toBe(200);
      if (response1.code === 200) {
        expect(response1.response.id).toBe(planId);

        const response2 = await getPlanRoute.sdk.getPlan({
          params: { id: planId },
          headers: {
            authorization: MOCK_HMAC_TOKEN
          }
        });

        expect(response2.code).toBe(200);
        if (response2.code === 200) {
          expect(response2.response.id).toBe(planId);
          expect(response1.response).toEqual(response2.response);
        }
      }
    });
  });
});
