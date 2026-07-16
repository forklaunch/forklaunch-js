import { sqlBaseProperties } from '../../../core/persistence/sql.base.properties';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';

export const GiftCard = defineComplianceEntity({
  name: 'GiftCard',
  properties: {
    ...sqlBaseProperties,
    code: fp.string().unique().compliance('none'),
    initialCents: fp.integer().compliance('none'),
    currency: fp.string().compliance('none'),
    balanceCents: fp.integer().compliance('none')
  }
});
