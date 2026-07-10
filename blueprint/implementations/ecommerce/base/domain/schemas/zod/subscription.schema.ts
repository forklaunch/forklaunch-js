import {
  array,
  date,
  enum_,
  number,
  optional,
  string,
  uuid
} from '@forklaunch/validator/zod';

const SubscriptionStatusEnum = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELED: 'canceled'
} as const;

const SubscriptionItemSchema = {
  variantId: string,
  quantity: number
};

export const CreateSubscriptionSchema = {
  customerId: string,
  items: array(SubscriptionItemSchema),
  intervalDays: number,
  nextOrderAt: date,
  providerSubRef: optional(string)
};

export const UpdateSubscriptionSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  items: optional(array(SubscriptionItemSchema)),
  intervalDays: optional(number),
  status: optional(enum_(SubscriptionStatusEnum)),
  nextOrderAt: optional(date),
  providerSubRef: optional(string)
});

export const SubscriptionSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  customerId: string,
  items: array(SubscriptionItemSchema),
  intervalDays: number,
  status: enum_(SubscriptionStatusEnum),
  nextOrderAt: date,
  providerSubRef: optional(string),
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const BaseSubscriptionServiceSchemas = (options: {
  uuidId: boolean;
}) => ({
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema: UpdateSubscriptionSchema(options),
  SubscriptionSchema: SubscriptionSchema(options)
});
