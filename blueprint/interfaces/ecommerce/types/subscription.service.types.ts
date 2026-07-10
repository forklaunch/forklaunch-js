import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export const SubscriptionStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELED: 'canceled'
} as const;

export type SubscriptionStatusType =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export type SubscriptionItemDto = {
  variantId: string;
  quantity: number;
};

export type CreateSubscriptionDto = Partial<IdDto> & {
  customerId: string;
  items: SubscriptionItemDto[];
  /** Reorder cadence in days (e.g. 30, 60, 90). */
  intervalDays: number;
  nextOrderAt: Date;
  /** Billing-provider subscription reference (Stripe Billing sub id), if linked. */
  providerSubRef?: string;
};

export type UpdateSubscriptionDto = Partial<IdDto> & {
  id: string;
  items?: SubscriptionItemDto[];
  intervalDays?: number;
  status?: SubscriptionStatusType;
  nextOrderAt?: Date;
  providerSubRef?: string;
};

export type SubscriptionDto = CreateSubscriptionDto &
  IdDto &
  Partial<RecordTimingDto> & {
    status: SubscriptionStatusType;
  };

export type SubscriptionServiceParameters = {
  CreateSubscriptionDto: CreateSubscriptionDto;
  UpdateSubscriptionDto: UpdateSubscriptionDto;
  SubscriptionDto: SubscriptionDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
