import {
  handlers,
  schemaValidator,
  SchemaValidator,
  string,
  type
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { StripeWebhookService } from '@forklaunch/implementation-billing-stripe/services';
import Stripe from 'stripe';
import { PartyEnum } from '../../domain/enum/party.enum';
import { StatusEnum } from '../../domain/enum/status.enum';
import { WebhookServiceFactory } from '../routes/webhook.routes';

export const WebhookController = (
  serviceFactory: WebhookServiceFactory,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    handleWebhookEvent: handlers.post(
      schemaValidator,
      '/',
      {
        name: 'handleWebhookEvent',
        summary: 'Handle a stripe event via webhook',
        body: type<Stripe.Event>(),
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Processing stripe event', req.body);
        await serviceFactory().handleWebhookEvent(req.body);
        res.status(200).send('ok');
      }
    )
  }) satisfies Controller<
    StripeWebhookService<SchemaValidator, typeof StatusEnum, typeof PartyEnum>
  >;
