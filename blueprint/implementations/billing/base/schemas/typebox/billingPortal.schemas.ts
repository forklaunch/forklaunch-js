import {
  date,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

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
