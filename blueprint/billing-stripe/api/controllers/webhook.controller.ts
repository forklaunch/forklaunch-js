import {
  handlers,
  SchemaValidator,
  string,
  type
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Controller } from '@forklaunch/core/controllers';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { ScopedDependencyFactory } from '@forklaunch/core/services';
import Stripe from 'stripe';
import { SchemaDependencies } from '../../registrations';

export const BillingPortalController = (
  serviceFactory: ScopedDependencyFactory<
    SchemaValidator,
    SchemaDependencies,
    'WebhookService'
  >,
  openTelemetryCollector: OpenTelemetryCollector<Metrics>
) =>
  ({
    processStripeEvent: handlers.post(
      SchemaValidator(),
      '/',
      {
        name: 'processStripeEvent',
        summary: 'Process a stripe event',
        body: type<Stripe.Event>(),
        responses: {
          200: string
        }
      },
      async (req, res) => {
        openTelemetryCollector.debug('Processing stripe event', req.body);
        res
          .status(200)
          .json(await serviceFactory().processStripeEvent(req.body));
      }
    )
  }) satisfies Controller<WebhookService>;
