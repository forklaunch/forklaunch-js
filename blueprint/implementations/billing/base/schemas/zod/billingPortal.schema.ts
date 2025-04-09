import {
  date,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/zod';

export const CreateBillingPortalSchema = {
  customerId: string,
  uri: string,
  expiresAt: date
};

export const UpdateBillingPortalSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  uri: optional(string),
  expiresAt: optional(date)
});

export const BillingPortalSchema = (uuidId: boolean) => ({
  id: uuidId ? uuid : string,
  customerId: string,
  uri: string,
  expiresAt: date,
  extraFields: optional(unknown),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseBillingPortalSchemas = (uuidId: boolean) => ({
  CreateBillingPortalSchema,
  UpdateBillingPortalSchema: UpdateBillingPortalSchema(uuidId),
  BillingPortalSchema: BillingPortalSchema(uuidId)
});
