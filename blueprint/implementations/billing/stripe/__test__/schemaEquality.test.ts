import { isTrue } from '@forklaunch/common';
import { DummyEnum, testSchemaEquality } from '@forklaunch/core/test';
import { PlanCadenceEnum } from '../domain';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
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
import {
  StripeBillingPortalDto,
  StripeCheckoutSessionDto,
  StripeCreateBillingPortalDto,
  StripeCreateCheckoutSessionDto,
  StripeCreatePaymentLinkDto,
  StripeCreatePlanDto,
  StripeCreateSubscriptionDto,
  StripePaymentLinkDto,
  StripePlanDto,
  StripeSubscriptionDto,
  StripeUpdateBillingPortalDto,
  StripeUpdateCheckoutSessionDto,
  StripeUpdatePaymentLinkDto,
  StripeUpdatePlanDto,
  StripeUpdateSubscriptionDto
} from '../types/stripe.types';

const zodCreateCheckoutSessionSchema =
  ZodCreateCheckoutSessionSchema(DummyEnum);
const typeboxCreateCheckoutSessionSchema =
  TypeboxCreateCheckoutSessionSchema(DummyEnum);
const zodUpdateCheckoutSessionSchema =
  ZodUpdateCheckoutSessionSchema(DummyEnum);
const typeboxUpdateCheckoutSessionSchema =
  TypeboxUpdateCheckoutSessionSchema(DummyEnum);
const zodCheckoutSessionSchema = ZodCheckoutSessionSchema(DummyEnum);
const typeboxCheckoutSessionSchema = TypeboxCheckoutSessionSchema(DummyEnum);

const zodCreatePaymentLinkSchema = ZodCreatePaymentLinkSchema(DummyEnum);
const typeboxCreatePaymentLinkSchema =
  TypeboxCreatePaymentLinkSchema(DummyEnum);
const zodUpdatePaymentLinkSchema = ZodUpdatePaymentLinkSchema(DummyEnum);
const typeboxUpdatePaymentLinkSchema =
  TypeboxUpdatePaymentLinkSchema(DummyEnum);
const zodPaymentLinkSchema = ZodPaymentLinkSchema(DummyEnum);
const typeboxPaymentLinkSchema = TypeboxPaymentLinkSchema(DummyEnum);

const zodCreateSubscriptionSchema = ZodCreateSubscriptionSchema(DummyEnum);
const typeboxCreateSubscriptionSchema =
  TypeboxCreateSubscriptionSchema(DummyEnum);
const zodUpdateSubscriptionSchema = ZodUpdateSubscriptionSchema(DummyEnum);
const typeboxUpdateSubscriptionSchema =
  TypeboxUpdateSubscriptionSchema(DummyEnum);
const zodSubscriptionSchema = ZodSubscriptionSchema(DummyEnum);
const typeboxSubscriptionSchema = TypeboxSubscriptionSchema(DummyEnum);

describe('schema equality', () => {
  it('should be equal for billing portal', () => {
    expect(
      isTrue(
        testSchemaEquality<StripeCreateBillingPortalDto>()(
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
        testSchemaEquality<StripeUpdateBillingPortalDto>()(
          ZodUpdateBillingPortalSchema,
          TypeboxUpdateBillingPortalSchema,
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
        testSchemaEquality<StripeBillingPortalDto>()(
          ZodBillingPortalSchema,
          TypeboxBillingPortalSchema,
          {
            id: 'test',
            customerId: 'test',
            uri: 'https://example.com',
            expiresAt: new Date()
          }
        )
      )
    ).toBeTruthy();
  });

  it('should be equal for checkout session', () => {
    expect(
      isTrue(
        testSchemaEquality<StripeCreateCheckoutSessionDto<typeof DummyEnum>>()(
          zodCreateCheckoutSessionSchema,
          typeboxCreateCheckoutSessionSchema,
          {
            customerId: 'test',
            paymentMethods: [PaymentMethodEnum.CARD, PaymentMethodEnum.AFFIRM],
            currency: CurrencyEnum.USD,
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com',
            expiresAt: new Date(),
            status: DummyEnum.A,
            mode: 'payment',
            lineItems: []
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<StripeUpdateCheckoutSessionDto<typeof DummyEnum>>()(
          zodUpdateCheckoutSessionSchema,
          typeboxUpdateCheckoutSessionSchema,
          {
            id: 'test',
            customerId: 'test',
            paymentMethods: [PaymentMethodEnum.CARD, PaymentMethodEnum.AFFIRM],
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<StripeCheckoutSessionDto<typeof DummyEnum>>()(
          zodCheckoutSessionSchema,
          typeboxCheckoutSessionSchema,
          {
            id: 'test',
            customerId: 'test',
            paymentMethods: [PaymentMethodEnum.CARD, PaymentMethodEnum.AFFIRM],
            currency: CurrencyEnum.USD,
            successRedirectUri: 'https://example.com',
            cancelRedirectUri: 'https://example.com',
            expiresAt: new Date(),
            lineItems: [],
            mode: 'payment',
            status: DummyEnum.A
          }
        )
      )
    ).toBeTruthy();
  });

  it('should be equal for payment link', () => {
    expect(
      isTrue(
        testSchemaEquality<StripeCreatePaymentLinkDto<typeof DummyEnum>>()(
          zodCreatePaymentLinkSchema,
          typeboxCreatePaymentLinkSchema,
          {
            amount: 100,
            currency: CurrencyEnum.USD,
            paymentMethods: [PaymentMethodEnum.CARD, PaymentMethodEnum.AFFIRM],
            status: DummyEnum.A,
            lineItems: []
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<StripeUpdatePaymentLinkDto<typeof DummyEnum>>()(
          zodUpdatePaymentLinkSchema,
          typeboxUpdatePaymentLinkSchema,
          {
            id: 'test',
            amount: 100,
            currency: CurrencyEnum.USD,
            lineItems: []
          }
        )
      )
    );

    expect(
      isTrue(
        testSchemaEquality<StripePaymentLinkDto<typeof DummyEnum>>()(
          zodPaymentLinkSchema,
          typeboxPaymentLinkSchema,
          {
            id: 'test',
            amount: 100,
            currency: CurrencyEnum.USD,
            paymentMethods: [PaymentMethodEnum.CARD, PaymentMethodEnum.AFFIRM],
            lineItems: [],
            status: DummyEnum.A
          }
        )
      )
    ).toBeTruthy();
  });

  it('should be equal for plan', () => {
    expect(
      isTrue(
        testSchemaEquality<StripeCreatePlanDto>()(
          ZodCreatePlanSchema,
          TypeboxCreatePlanSchema,
          {
            name: 'test',
            price: 100,
            cadence: PlanCadenceEnum.ANNUALLY,
            currency: CurrencyEnum.USD,
            features: [DummyEnum.A, DummyEnum.B],
            externalId: 'test',
            active: true,
            description: 'test'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<StripeUpdatePlanDto>()(
          ZodUpdatePlanSchema,
          TypeboxUpdatePlanSchema,
          {
            id: 'test',
            name: 'test',
            price: 100,
            cadence: PlanCadenceEnum.ANNUALLY,
            features: [DummyEnum.A, DummyEnum.B],
            externalId: 'test',
            active: true,
            description: 'test'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<StripePlanDto>()(ZodPlanSchema, TypeboxPlanSchema, {
          id: 'test',
          name: 'test',
          price: 100,
          cadence: PlanCadenceEnum.ANNUALLY,
          currency: CurrencyEnum.USD,
          features: [DummyEnum.A, DummyEnum.B],
          externalId: 'test',
          active: true,
          description: 'test'
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for subscription', () => {
    expect(
      isTrue(
        testSchemaEquality<StripeCreateSubscriptionDto<typeof DummyEnum>>()(
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
            billingProvider: 'stripe'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<StripeUpdateSubscriptionDto<typeof DummyEnum>>()(
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
            billingProvider: 'stripe'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<StripeSubscriptionDto<typeof DummyEnum>>()(
          zodSubscriptionSchema,
          typeboxSubscriptionSchema,
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
            billingProvider: 'stripe'
          }
        )
      )
    ).toBeTruthy();
  });
});
