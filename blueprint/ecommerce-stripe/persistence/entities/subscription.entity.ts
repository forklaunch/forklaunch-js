import { sqlBaseProperties } from '../../../core/persistence/sql.base.properties';
import {
  SubscriptionItemDto,
  SubscriptionStatus
} from '@forklaunch/interfaces-ecommerce/types';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';

export const Subscription = defineComplianceEntity({
  name: 'Subscription',
  properties: {
    ...sqlBaseProperties,
    // Reference id only; customer PII lives on the (future) Customer entity.
    customerId: fp.string().compliance('none'),
    items: fp.json<SubscriptionItemDto[]>().compliance('none'),
    intervalDays: fp.integer().compliance('none'),
    status: fp.enum(() => SubscriptionStatus).compliance('none'),
    nextOrderAt: fp.datetime().compliance('none'),
    providerSubRef: fp.string().nullable().compliance('none')
  }
});
