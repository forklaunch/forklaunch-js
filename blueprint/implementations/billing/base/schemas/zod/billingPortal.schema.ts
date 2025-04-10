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

export const UpdateBillingPortalSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  uri: optional(string),
  expiresAt: optional(date)
});

export const BillingPortalSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  customerId: string,
  uri: string,
  expiresAt: date,
  extraFields: optional(unknown),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseBillingPortalServiceSchemas = (options: {
  uuidId: boolean;
}) => ({
  CreateBillingPortalSchema,
  UpdateBillingPortalSchema: UpdateBillingPortalSchema(options),
  BillingPortalSchema: BillingPortalSchema(options)
});
