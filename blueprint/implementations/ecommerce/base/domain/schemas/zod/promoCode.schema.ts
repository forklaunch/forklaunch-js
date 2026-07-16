import {
  boolean,
  date,
  enum_,
  number,
  optional,
  string,
  uuid
} from '@forklaunch/validator/zod';

const PromoCodeTypeEnum = {
  PERCENT: 'percent',
  FIXED: 'fixed',
  FREE_SHIPPING: 'free_shipping'
} as const;

export const CreatePromoCodeSchema = {
  code: string,
  type: enum_(PromoCodeTypeEnum),
  value: number,
  maxRedemptions: optional(number),
  minSubtotalCents: optional(number),
  expiresAt: optional(date)
};

export const UpdatePromoCodeSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  active: optional(boolean)
});

export const PromoCodeSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  code: string,
  type: enum_(PromoCodeTypeEnum),
  value: number,
  maxRedemptions: optional(number),
  minSubtotalCents: optional(number),
  expiresAt: optional(date),
  timesRedeemed: number,
  active: boolean,
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const RedeemPromoCodeSchema = {
  code: string,
  subtotalCents: number
};

export const PromoCodeRedemptionResultSchema = {
  valid: boolean,
  reason: optional(string),
  discountCents: number,
  freeShipping: boolean
};

export const BasePromoCodeServiceSchemas = (options: { uuidId: boolean }) => ({
  CreatePromoCodeSchema,
  UpdatePromoCodeSchema: UpdatePromoCodeSchema(options),
  PromoCodeSchema: PromoCodeSchema(options),
  RedeemPromoCodeSchema,
  PromoCodeRedemptionResultSchema
});
