import { boolean, date, number, optional, string, uuid } from '@forklaunch/validator/zod';

export const CreateGiftCardSchema = {
  code: string,
  initialCents: number,
  currency: string
};

export const GiftCardSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  code: string,
  initialCents: number,
  currency: string,
  balanceCents: number,
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const RedeemGiftCardSchema = {
  code: string,
  requestedCents: number
};

export const GiftCardRedemptionResultSchema = {
  valid: boolean,
  reason: optional(string),
  appliedCents: number
};

export const BaseGiftCardServiceSchemas = (options: { uuidId: boolean }) => ({
  CreateGiftCardSchema,
  GiftCardSchema: GiftCardSchema(options),
  RedeemGiftCardSchema,
  GiftCardRedemptionResultSchema
});
