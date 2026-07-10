import { handlers, schemaValidator, string } from '../../schema';
import { ci, tokens } from '../../bootstrapper';
import Stripe from 'stripe';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const serviceFactory = ci.scopedResolver(tokens.PaymentService);
const stripeClient = ci.resolve(tokens.StripeClient);
const STRIPE_WEBHOOK_SECRET = ci.resolve(tokens.STRIPE_WEBHOOK_SECRET);

/**
 * ECOM-10: idempotent webhook confirms `paid` even if the buyer closes the
 * tab. Signature-verified, public access (Stripe calls this directly).
 * Payment lookup/transition is keyed on providerRef (the PaymentIntent id),
 * not our internal id — a webhook never has that.
 */
export const handlePaymentWebhook = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Handle Payment Webhook',
    access: 'public',
    summary: 'Handle a Stripe payment webhook event',
    body: { text: string },
    requestHeaders: { 'stripe-signature': string },
    responses: { 200: string, 400: string }
  },
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      openTelemetryCollector.error(
        'Webhook signature verification failed.',
        err instanceof Error ? err.message : 'Unknown error'
      );
      return res.status(400).send('Webhook signature verification failed');
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    switch (event.type) {
      case 'payment_intent.succeeded':
        await serviceFactory().confirmPayment({
          providerRef: paymentIntent.id
        });
        break;
      case 'payment_intent.payment_failed':
        await serviceFactory().failPayment({ providerRef: paymentIntent.id });
        break;
      default:
        openTelemetryCollector.debug('Ignoring unhandled event type', event.type);
    }

    res.status(200).send('Webhook event processed');
  }
);
