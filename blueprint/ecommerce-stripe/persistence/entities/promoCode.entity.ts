import { sqlBaseProperties } from '../../../core/persistence/sql.base.properties';
import { PromoCodeType } from '@forklaunch/interfaces-ecommerce/types';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';

export const PromoCode = defineComplianceEntity({
  name: 'PromoCode',
  properties: {
    ...sqlBaseProperties,
    code: fp.string().unique().compliance('none'),
    type: fp.enum(() => PromoCodeType).compliance('none'),
    value: fp.integer().compliance('none'),
    maxRedemptions: fp.integer().nullable().compliance('none'),
    minSubtotalCents: fp.integer().nullable().compliance('none'),
    expiresAt: fp.datetime().nullable().compliance('none'),
    timesRedeemed: fp.integer().compliance('none'),
    active: fp.boolean().compliance('none')
  }
});
