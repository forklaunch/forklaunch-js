import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { sdkRouter } from '@forklaunch/core/http';
import { ci, tokens } from '../../server';
import { WebhookController } from '../controllers/webhook.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const webhookServiceFactory = ci.scopedResolver(tokens.WebhookService);

export type WebhookServiceFactory = typeof webhookServiceFactory;

export const webhookRouter = forklaunchRouter(
  '/webhook',
  schemaValidator,
  openTelemetryCollector
);
const controller = WebhookController(
  webhookServiceFactory,
  openTelemetryCollector
);

webhookRouter.post('/', controller.handleWebhookEvent);

export const webhookSdkRouter = sdkRouter(
  schemaValidator,
  controller,
  webhookRouter
);
