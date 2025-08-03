import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { BillingPortalController } from '../controllers/billingPortal.controller';

const schemaValidator = SchemaValidator();
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const billingPortalServiceFactory = ci.scopedResolver(
  tokens.BillingPortalService
);

export type BillingPortalServiceFactory = typeof billingPortalServiceFactory;

export const billingPortalRouter = forklaunchRouter(
  '/billing-portal',
  schemaValidator,
  openTelemetryCollector
);
const controller = BillingPortalController(
  billingPortalServiceFactory,
  openTelemetryCollector
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
