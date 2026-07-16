import { sqlBaseProperties } from '../../../core/persistence/sql.base.properties';
import {
  OrderItemDto,
  OrderStatus,
  ShippingAddressDto,
  TaxLineDto
} from '@forklaunch/interfaces-ecommerce/types';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';

export const Order = defineComplianceEntity({
  name: 'Order',
  properties: {
    ...sqlBaseProperties,
    customerId: fp.string().nullable().compliance('none'),
    status: fp.enum(() => OrderStatus).compliance('none'),
    items: fp.json<OrderItemDto[]>().compliance('none'),
    // A name + street address is real PII — tagged 'pii' (not 'none') so
    // the framework encrypts it at rest automatically, per Guild's own
    // commerce-security guide ("PII — minimize, encrypt at rest").
    shippingAddress: fp.json<ShippingAddressDto>().compliance('pii'),
    subtotalCents: fp.integer().compliance('none'),
    taxCents: fp.integer().compliance('none'),
    // Per-jurisdiction breakdown, not just the total — the tax-compliance
    // guide is explicit this is required for reconciliation/filing, not a
    // nice-to-have audit trail.
    taxBreakdown: fp.json<TaxLineDto[]>().compliance('none'),
    shippingCents: fp.integer().compliance('none'),
    totalCents: fp.integer().compliance('none')
  }
});
