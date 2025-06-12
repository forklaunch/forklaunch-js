import { isTrue } from '@forklaunch/common';
import { DummyEnum, testSchemaEquality } from '@forklaunch/core/test';
import {
  BillingPortalSchema as TypeboxBillingPortalSchema,
  CreateBillingPortalSchema as TypeboxCreateBillingPortalSchema,
  UpdateBillingPortalSchema as TypeboxUpdateBillingPortalSchema
} from '../schemas/typebox/billingPortal.schema';
import {
  CheckoutSessionSchema as TypeboxCheckoutSessionSchema,
  CreateCheckoutSessionSchema as TypeboxCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as TypeboxUpdateCheckoutSessionSchema
} from '../schemas/typebox/checkoutSession.schema';
import {
  CreatePaymentLinkSchema as TypeboxCreatePaymentLinkSchema,
  PaymentLinkSchema as TypeboxPaymentLinkSchema,
  UpdatePaymentLinkSchema as TypeboxUpdatePaymentLinkSchema
} from '../schemas/typebox/paymentLink.schema';
import {
  CreatePlanSchema as TypeboxCreatePlanSchema,
  PlanSchema as TypeboxPlanSchema,
  UpdatePlanSchema as TypeboxUpdatePlanSchema
} from '../schemas/typebox/plan.schema';
import {
  CreateSubscriptionSchema as TypeboxCreateSubscriptionSchema,
  SubscriptionSchema as TypeboxSubscriptionSchema,
  UpdateSubscriptionSchema as TypeboxUpdateSubscriptionSchema
} from '../schemas/typebox/subscription.schema';
import {
  BillingPortalSchema as ZodBillingPortalSchema,
  CreateBillingPortalSchema as ZodCreateBillingPortalSchema,
  UpdateBillingPortalSchema as ZodUpdateBillingPortalSchema
} from '../schemas/zod/billingPortal.schema';
import {
  CheckoutSessionSchema as ZodCheckoutSessionSchema,
  CreateCheckoutSessionSchema as ZodCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as ZodUpdateCheckoutSessionSchema
} from '../schemas/zod/checkoutSession.schema';
import {
  CreatePaymentLinkSchema as ZodCreatePaymentLinkSchema,
  PaymentLinkSchema as ZodPaymentLinkSchema,
  UpdatePaymentLinkSchema as ZodUpdatePaymentLinkSchema
} from '../schemas/zod/paymentLink.schema';
import {
  CreatePlanSchema as ZodCreatePlanSchema,
  PlanSchema as ZodPlanSchema,
  UpdatePlanSchema as ZodUpdatePlanSchema
} from '../schemas/zod/plan.schema';
import {
  CreateSubscriptionSchema as ZodCreateSubscriptionSchema,
  SubscriptionSchema as ZodSubscriptionSchema,
  UpdateSubscriptionSchema as ZodUpdateSubscriptionSchema
} from '../schemas/zod/subscription.schema';

const zodUpdateBillingPortalSchema = ZodUpdateBillingPortalSchema({
  uuidId: false
});
const typeboxUpdateBillingPortalSchema = TypeboxUpdateBillingPortalSchema({
  uuidId: false
});
const zodBillingPortalSchema = ZodBillingPortalSchema({ uuidId: false });
const typeboxBillingPortalSchema = TypeboxBillingPortalSchema({
  uuidId: false
});

const zodCreateCheckoutSessionSchema = ZodCreateCheckoutSessionSchema(
  DummyEnum,
  DummyEnum
);
const typeboxCreateCheckoutSessionSchema = TypeboxCreateCheckoutSessionSchema(
  DummyEnum,
  DummyEnum
);
const zodUpdateCheckoutSessionSchema = ZodUpdateCheckoutSessionSchema({
  uuidId: false
})(DummyEnum, DummyEnum);
const typeboxUpdateCheckoutSessionSchema = TypeboxUpdateCheckoutSessionSchema({
  uuidId: false
})(DummyEnum, DummyEnum);
const zodCheckoutSessionSchema = ZodCheckoutSessionSchema({ uuidId: true })(
  DummyEnum,
  DummyEnum
);
const typeboxCheckoutSessionSchema = TypeboxCheckoutSessionSchema({
  uuidId: true
})(DummyEnum, DummyEnum);

const zodCreatePaymentLinkSchema = ZodCreatePaymentLinkSchema(
  DummyEnum,
  DummyEnum
);
const typeboxCreatePaymentLinkSchema = TypeboxCreatePaymentLinkSchema(
  DummyEnum,
  DummyEnum
);
const zodUpdatePaymentLinkSchema = ZodUpdatePaymentLinkSchema({
  uuidId: false
})(DummyEnum, DummyEnum);
const typeboxUpdatePaymentLinkSchema = TypeboxUpdatePaymentLinkSchema({
  uuidId: false
})(DummyEnum, DummyEnum);
const zodPaymentLinkSchema = ZodPaymentLinkSchema({ uuidId: true })(
  DummyEnum,
  DummyEnum
);
const typeboxPaymentLinkSchema = TypeboxPaymentLinkSchema({
  uuidId: false
})(DummyEnum, DummyEnum);

const zodCreatePlanSchema = ZodCreatePlanSchema(DummyEnum, DummyEnum);
const typeboxCreatePlanSchema = TypeboxCreatePlanSchema(DummyEnum, DummyEnum);
const zodUpdatePlanSchema = ZodUpdatePlanSchema({ uuidId: false })(
  DummyEnum,
  DummyEnum
);
const typeboxUpdatePlanSchema = TypeboxUpdatePlanSchema({ uuidId: false })(
  DummyEnum,
  DummyEnum
);
const zodPlanSchema = ZodPlanSchema({ uuidId: true })(DummyEnum, DummyEnum);
const typeboxPlanSchema = TypeboxPlanSchema({ uuidId: true })(
  DummyEnum,
  DummyEnum
);

const zodCreateSubscriptionSchema = ZodCreateSubscriptionSchema(
  DummyEnum,
  DummyEnum
);
const typeboxCreateSubscriptionSchema = TypeboxCreateSubscriptionSchema(
  DummyEnum,
  DummyEnum
);
const zodUpdateSubscriptionSchema = ZodUpdateSubscriptionSchema({
  uuidId: false
})(DummyEnum, DummyEnum);
const typeboxUpdateSubscriptionSchema = TypeboxUpdateSubscriptionSchema({
  uuidId: false
})(DummyEnum, DummyEnum);
const zodSubscriptionSchema = ZodSubscriptionSchema({ uuidId: true })(
  DummyEnum,
  DummyEnum
);
const typeboxSubscriptionSchema = TypeboxSubscriptionSchema({
  uuidId: true
})(DummyEnum, DummyEnum);

describe('schema equality', () => {
  it('should be equal for billing portal', () => {
    expect(
      isTrue(
        testSchemaEquality(
          ZodCreateBillingPortalSchema,
          TypeboxCreateBillingPortalSchema,
          {
            customerId: 'test',
            uri: 'https://example.com',
            expiresAt: new Date()
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(
          zodUpdateBillingPortalSchema,
          typeboxUpdateBillingPortalSchema,
          {
            id: 'test',
            uri: 'https://example.com',
            expiresAt: new Date()
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodBillingPortalSchema, typeboxBillingPortalSchema, {
          id: 'test',
          customerId: 'test',
          uri: 'https://example.com',
          expiresAt: new Date(),
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for checkout session', () => {
    expect(
      isTrue(
        testSchemaEquality(
          zodCreateCheckoutSessionSchema,
          typeboxCreateCheckoutSessionSchema,
          {
            customerId: 'test',
            paymentMethods: [DummyEnum.A, DummyEnum.B],
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com',
            expiresAt: new Date(),
            status: DummyEnum.A,
            extraFields: {
              test: 'test'
            }
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(
          zodUpdateCheckoutSessionSchema,
          typeboxUpdateCheckoutSessionSchema,
          {
            id: 'test',
            customerId: 'test',
            paymentMethods: [DummyEnum.A, DummyEnum.B],
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com',
            extraFields: {
              test: 'test'
            }
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(
          zodCheckoutSessionSchema,
          typeboxCheckoutSessionSchema,
          {
            id: 'test',
            customerId: 'test',
            paymentMethods: [DummyEnum.A, DummyEnum.B],
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com',
            expiresAt: new Date(),
            status: DummyEnum.A,
            extraFields: {
              test: 'test'
            }
          }
        )
      )
    ).toBeTruthy();
  });

  it('should be equal for payment link', () => {
    expect(
      isTrue(
        testSchemaEquality(
          zodCreatePaymentLinkSchema,
          typeboxCreatePaymentLinkSchema,
          {
            amount: 100,
            currency: DummyEnum.A,
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com',
            description: 'test',
            metadata: {
              test: 'test'
            },
            expiresAt: new Date(),
            status: DummyEnum.A,
            extraFields: {
              test: 'test'
            }
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(
          zodUpdatePaymentLinkSchema,
          typeboxUpdatePaymentLinkSchema,
          {
            id: 'test',
            amount: 100,
            currency: DummyEnum.A,
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com',
            description: 'test',
            metadata: {
              test: 'test'
            },
            extraFields: {
              test: 'test'
            }
          }
        )
      )
    );

    expect(
      isTrue(
        testSchemaEquality(zodPaymentLinkSchema, typeboxPaymentLinkSchema, {
          id: 'test',
          amount: 100,
          currency: DummyEnum.A,
          successRedirectUri: 'https://example.com',
          cancelRedirectUri: 'https://example.com',
          description: 'test',
          metadata: {
            test: 'test'
          },
          expiresAt: new Date(),
          status: DummyEnum.A,
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for plan', () => {
    expect(
      isTrue(
        testSchemaEquality(zodCreatePlanSchema, typeboxCreatePlanSchema, {
          name: 'test',
          price: 100,
          cadence: DummyEnum.A,
          features: [DummyEnum.A, DummyEnum.B],
          externalId: 'test',
          active: true,
          description: 'test',
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodUpdatePlanSchema, typeboxUpdatePlanSchema, {
          id: 'test',
          name: 'test',
          price: 100,
          cadence: DummyEnum.A,
          features: [DummyEnum.A, DummyEnum.B],
          externalId: 'test',
          active: true,
          description: 'test',
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodPlanSchema, typeboxPlanSchema, {
          id: 'test',
          name: 'test',
          price: 100,
          cadence: DummyEnum.A,
          features: [DummyEnum.A, DummyEnum.B],
          externalId: 'test',
          active: true,
          description: 'test',
          extraFields: {
            test: 'test'
          }
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for subscription', () => {
    expect(
      isTrue(
        testSchemaEquality(
          zodCreateSubscriptionSchema,
          typeboxCreateSubscriptionSchema,
          {
            partyId: 'test',
            partyType: DummyEnum.A,
            productId: 'test',
            status: DummyEnum.A,
            active: true,
            externalId: 'test',
            startDate: new Date(),
            endDate: new Date(),
            description: 'test',
            extraFields: {
              test: 'test'
            },
            billingProvider: DummyEnum.A
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(
          zodUpdateSubscriptionSchema,
          typeboxUpdateSubscriptionSchema,
          {
            id: 'test',
            partyId: 'test',
            partyType: DummyEnum.A,
            productId: 'test',
            status: DummyEnum.A,
            active: true,
            externalId: 'test',
            startDate: new Date(),
            endDate: new Date(),
            description: 'test',
            extraFields: {
              test: 'test'
            },
            billingProvider: DummyEnum.A
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality(zodSubscriptionSchema, typeboxSubscriptionSchema, {
          id: 'test',
          partyId: 'test',
          partyType: DummyEnum.A,
          productId: 'test',
          status: DummyEnum.A,
          active: true,
          externalId: 'test',
          startDate: new Date(),
          endDate: new Date(),
          description: 'test',
          extraFields: {
            test: 'test'
          },
          billingProvider: DummyEnum.A
        })
      )
    ).toBeTruthy();
  });
});
