import { forklaunchRouter, schemaValidator } from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import { handleWebhookEvent } from '../controllers/webhook.controller';

const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

export const webhookRouter = forklaunchRouter(
  '/webhook',
  schemaValidator,
  openTelemetryCollector
);

webhookRouter.post('/', handleWebhookEvent);
