import { IdiomaticSchema, Schema } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  BillingPortalSchema as TypeboxBillingPortalSchema,
  CreateBillingPortalSchema as TypeboxCreateBillingPortalSchema,
  UpdateBillingPortalSchema as TypeboxUpdateBillingPortalSchema
} from '../schemas/typebox/billingPortal.schemas';
import {
  CheckoutSessionSchema as TypeboxCheckoutSessionSchema,
  CreateCheckoutSessionSchema as TypeboxCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as TypeboxUpdateCheckoutSessionSchema
} from '../schemas/typebox/checkoutSession.schemas';
import {
  CreatePaymentLinkSchema as TypeboxCreatePaymentLinkSchema,
  PaymentLinkSchema as TypeboxPaymentLinkSchema,
  UpdatePaymentLinkSchema as TypeboxUpdatePaymentLinkSchema
} from '../schemas/typebox/paymentLink.schemas';
import {
  CreatePlanSchema as TypeboxCreatePlanSchema,
  PlanSchema as TypeboxPlanSchema,
  UpdatePlanSchema as TypeboxUpdatePlanSchema
} from '../schemas/typebox/plan.schemas';
import {
  CreateSubscriptionSchema as TypeboxCreateSubscriptionSchema,
  SubscriptionSchema as TypeboxSubscriptionSchema,
  UpdateSubscriptionSchema as TypeboxUpdateSubscriptionSchema
} from '../schemas/typebox/subscription.schemas';
import {
  BillingPortalSchema as ZodBillingPortalSchema,
  CreateBillingPortalSchema as ZodCreateBillingPortalSchema,
  UpdateBillingPortalSchema as ZodUpdateBillingPortalSchema
} from '../schemas/zod/billingPortal.schemas';
import {
  CheckoutSessionSchema as ZodCheckoutSessionSchema,
  CreateCheckoutSessionSchema as ZodCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as ZodUpdateCheckoutSessionSchema
} from '../schemas/zod/checkoutSession.schemas';
import {
  CreatePaymentLinkSchema as ZodCreatePaymentLinkSchema,
  PaymentLinkSchema as ZodPaymentLinkSchema,
  UpdatePaymentLinkSchema as ZodUpdatePaymentLinkSchema
} from '../schemas/zod/paymentLink.schemas';
import {
  CreatePlanSchema as ZodCreatePlanSchema,
  PlanSchema as ZodPlanSchema,
  UpdatePlanSchema as ZodUpdatePlanSchema
} from '../schemas/zod/plan.schemas';
import {
  CreateSubscriptionSchema as ZodCreateSubscriptionSchema,
  SubscriptionSchema as ZodSubscriptionSchema,
  UpdateSubscriptionSchema as ZodUpdateSubscriptionSchema
} from '../schemas/zod/subscription.schemas';

function testSchemaEquality<
  Z extends IdiomaticSchema<ZodSchemaValidator>,
  T extends IdiomaticSchema<TypeboxSchemaValidator>
>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _zodSchema: Z,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _typeBoxSchema: T
): Schema<Z, ZodSchemaValidator> extends Schema<T, TypeboxSchemaValidator>
  ? Schema<T, TypeboxSchemaValidator> extends Schema<Z, ZodSchemaValidator>
    ? true
    : false
  : false {
  return {} as never;
}

function isTrue(value: true) {
  return value;
}

enum DummyEnum {
  A = 'A',
  B = 'B'
}

isTrue(
  testSchemaEquality(
    ZodCreateBillingPortalSchema,
    TypeboxCreateBillingPortalSchema
  )
);
isTrue(
  testSchemaEquality(
    ZodUpdateBillingPortalSchema(true),
    TypeboxUpdateBillingPortalSchema(true)
  )
);
isTrue(
  testSchemaEquality(
    ZodBillingPortalSchema(true),
    TypeboxBillingPortalSchema(true)
  )
);

isTrue(
  testSchemaEquality(
    ZodCreateCheckoutSessionSchema(DummyEnum),
    TypeboxCreateCheckoutSessionSchema(DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodUpdateCheckoutSessionSchema(true)(DummyEnum),
    TypeboxUpdateCheckoutSessionSchema(true)(DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodCheckoutSessionSchema(true)(DummyEnum),
    TypeboxCheckoutSessionSchema(true)(DummyEnum)
  )
);

isTrue(
  testSchemaEquality(
    ZodCreatePaymentLinkSchema(DummyEnum),
    TypeboxCreatePaymentLinkSchema(DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodUpdatePaymentLinkSchema(true)(DummyEnum),
    TypeboxUpdatePaymentLinkSchema(true)(DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodPaymentLinkSchema(true)(DummyEnum),
    TypeboxPaymentLinkSchema(true)(DummyEnum)
  )
);

isTrue(
  testSchemaEquality(
    ZodCreatePlanSchema(DummyEnum, DummyEnum),
    TypeboxCreatePlanSchema(DummyEnum, DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodUpdatePlanSchema(true)(DummyEnum, DummyEnum),
    TypeboxUpdatePlanSchema(true)(DummyEnum, DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodPlanSchema(true)(DummyEnum, DummyEnum),
    TypeboxPlanSchema(true)(DummyEnum, DummyEnum)
  )
);

isTrue(
  testSchemaEquality(
    ZodCreateSubscriptionSchema(DummyEnum, DummyEnum),
    TypeboxCreateSubscriptionSchema(DummyEnum, DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodUpdateSubscriptionSchema(true)(DummyEnum, DummyEnum),
    TypeboxUpdateSubscriptionSchema(true)(DummyEnum, DummyEnum)
  )
);
isTrue(
  testSchemaEquality(
    ZodSubscriptionSchema(true)(DummyEnum, DummyEnum),
    TypeboxSubscriptionSchema(true)(DummyEnum, DummyEnum)
  )
);
