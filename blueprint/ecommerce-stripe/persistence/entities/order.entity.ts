import { sqlBaseProperties } from '../../../core/persistence/sql.base.properties';
import { OrderItemDto, OrderStatus } from '@forklaunch/interfaces-ecommerce/types';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';

export const Order = defineComplianceEntity({
  name: 'Order',
  properties: {
    ...sqlBaseProperties,
    customerId: fp.string().nullable().compliance('none'),
    status: fp.enum(() => OrderStatus).compliance('none'),
    items: fp.json<OrderItemDto[]>().compliance('none'),
    subtotalCents: fp.integer().compliance('none'),
    taxCents: fp.integer().compliance('none'),
    totalCents: fp.integer().compliance('none')
  }
});
