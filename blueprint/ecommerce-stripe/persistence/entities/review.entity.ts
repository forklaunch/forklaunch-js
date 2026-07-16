import { sqlBaseProperties } from '../../../core/persistence/sql.base.properties';
import {
  ReviewMediaDto,
  ReviewStatus
} from '@forklaunch/interfaces-ecommerce/types';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';

export const Review = defineComplianceEntity({
  name: 'Review',
  properties: {
    ...sqlBaseProperties,
    productId: fp.string().compliance('none'),
    // Verified-buyer badge — set when the review is tied to a real order.
    orderId: fp.string().nullable().compliance('none'),
    rating: fp.integer().compliance('none'),
    title: fp.string().nullable().compliance('none'),
    body: fp.string().compliance('none'),
    media: fp.json<ReviewMediaDto[]>().nullable().compliance('none'),
    status: fp.enum(() => ReviewStatus).compliance('none')
  }
});
