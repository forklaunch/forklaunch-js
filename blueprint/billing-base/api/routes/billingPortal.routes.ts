import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../bootstrapper';
import { BillingPortalController } from '../controllers/billingPortal.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const billingPortalServiceFactory = ci.scopedResolver(
  tokens.BillingPortalService
);
const JWKS_PUBLIC_KEY_URL = ci.resolve(tokens.JWKS_PUBLIC_KEY_URL);

export type BillingPortalServiceFactory = typeof billingPortalServiceFactory;

export const billingPortalRouter = forklaunchRouter(
  '/billing-portal',
  schemaValidator,
  openTelemetryCollector
);
const controller = BillingPortalController(
  billingPortalServiceFactory,
  openTelemetryCollector,
  JWKS_PUBLIC_KEY_URL
);

billingPortalRouter.post('/', controller.createBillingPortalSession);
billingPortalRouter.get('/:id', controller.getBillingPortalSession);
billingPortalRouter.put('/:id', controller.updateBillingPortalSession);
billingPortalRouter.delete('/:id', controller.expireBillingPortalSession);

export const billingPortalSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  billingPortalRouter
);
