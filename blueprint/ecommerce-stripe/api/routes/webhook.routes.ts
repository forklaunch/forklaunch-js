import { forklaunchRouter, schemaValidator } from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import { handlePaymentWebhook } from '../controllers/webhook.controller';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);

export const webhookRouter = forklaunchRouter(
  '/webhook',
  schemaValidator,
  openTelemetryCollector
);

export const handlePaymentWebhookRoute = webhookRouter.post(
  '/',
  handlePaymentWebhook
);
