import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import {
  createBillingPortalSession,
  expireBillingPortalSession,
  getBillingPortalSession,
  updateBillingPortalSession
} from '../controllers/billingPortal.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const billingPortalRouter = forklaunchRouter(
  '/billing-portal',
  schemaValidator,
  openTelemetryCollector
);

billingPortalRouter.post('/', createBillingPortalSession);
billingPortalRouter.get('/:id', getBillingPortalSession);
billingPortalRouter.put('/:id', updateBillingPortalSession);
billingPortalRouter.delete('/:id', expireBillingPortalSession);
