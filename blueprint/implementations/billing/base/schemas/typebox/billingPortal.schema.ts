import {
  date,
  optional,
  string,
  unknown,
  uuid
} from '@forklaunch/validator/typebox';

export const CreateBillingPortalSchema = {
  customerId: string,
  expiresAt: date,
  uri: optional(string),
  extraFields: optional(unknown)
};

export const UpdateBillingPortalSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  uri: optional(string),
  expiresAt: optional(date),
  extraFields: optional(unknown)
});

export const BillingPortalSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  customerId: string,
  uri: optional(string),
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
