import { handlers, schemaValidator, string } from '../../schema';
import { OrderMapper } from '../../domain/mappers/order.mappers';
import { ci, tokens } from '../../bootstrapper';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const cartServiceFactory = ci.scopedResolver(tokens.CartService);
const variantServiceFactory = ci.scopedResolver(tokens.VariantService);
const inventoryServiceFactory = ci.scopedResolver(tokens.InventoryService);
const orderServiceFactory = ci.scopedResolver(tokens.OrderService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

/**
 * The unified checkout orchestration (ECOM-09): cart -> order in one call,
 * with stock validated up front so a customer never pays for something
 * that's not actually there. Tax and promo/discount are deliberately
 * injected seams, not built here — this endpoint is where they'd plug in
 * (see the taxCents/discount comments below), matching the ticket's own
 * "injected via seams" framing rather than building ECOM-11/ECOM-18 now.
 */
export const checkout = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Checkout',
    access: 'internal',
    summary: 'Convert a cart into an order, validating stock first',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: { cartId: string },
    responses: {
      200: OrderMapper.schema,
      400: string
    }
  },
  async (req, res) => {
    const cart = await cartServiceFactory().getCart({ id: req.body.cartId });

    if (!cart.items.length) {
      res.status(400).send('Cannot checkout an empty cart');
      return;
    }

    // Stock check up front, before anything is priced or persisted — a
    // customer should never be told an order succeeded and then find out
    // separately that an item was unavailable.
    const stockChecks = await Promise.all(
      cart.items.map((item) =>
        inventoryServiceFactory().checkStock({
          variantId: item.variantId,
          requested: item.quantity
        })
      )
    );
    const outOfStock = stockChecks.filter((check) => !check.available);
    if (outOfStock.length) {
      res
        .status(400)
        .send(
          `Insufficient stock for variant(s): ${outOfStock
            .map((c) => c.variantId)
            .join(', ')}`
        );
      return;
    }

    // Price each line from the variant's current price — the cart itself
    // only carries variantId + quantity, never a price (prices can move
    // between add-to-cart and checkout; checkout always uses the price at
    // the moment of purchase).
    const variants = await Promise.all(
      cart.items.map((item) =>
        variantServiceFactory().getVariant({ id: item.variantId })
      )
    );
    const orderItems = cart.items.map((item, i) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceCents: variants[i].priceCents
    }));

    const subtotalCents = orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0
    );
    // Seam for ECOM-18 (tax) — a real TaxService would compute this from
    // the order + a shipping address, neither of which the cart carries
    // yet. Zero, not omitted, so the total is never silently wrong.
    const taxCents = 0;
    // Seam for ECOM-11 (promo/discount) — would validate-and-apply a code
    // here, adjusting subtotalCents before totalCents is computed.
    const totalCents = subtotalCents + taxCents;

    const order = await orderServiceFactory().createOrder({
      customerId: cart.customerId,
      items: orderItems,
      subtotalCents,
      taxCents,
      totalCents
    });

    await cartServiceFactory().clearCart({ id: cart.id });

    openTelemetryCollector.info('Checkout completed', {
      cartId: cart.id,
      orderId: order.id
    });
    res.status(200).json(order);
  }
);
