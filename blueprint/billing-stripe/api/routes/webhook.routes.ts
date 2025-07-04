import { forklaunchRouter, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import { SchemaDependencies } from '../../registrations';
import { WebhookController } from '../controllers/webhook.controller';

export const WebhookRoutes = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'WebhookService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) => {
  const router = forklaunchRouter(
    '/webhook',
    SchemaValidator(),
    openTelemetryCollector
  );

  const controller = WebhookController(serviceFactory, openTelemetryCollector);

  return router.post('/', controller.handleWebhookEvent);
};
