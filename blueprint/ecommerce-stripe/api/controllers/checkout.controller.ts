import { handlers, optional, schemaValidator, string } from '../../schema';
import { OrderMapper } from '../../domain/mappers/order.mappers';
import { ci, tokens } from '../../bootstrapper';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const cartServiceFactory = ci.scopedResolver(tokens.CartService);
const variantServiceFactory = ci.scopedResolver(tokens.VariantService);
const inventoryServiceFactory = ci.scopedResolver(tokens.InventoryService);
const orderServiceFactory = ci.scopedResolver(tokens.OrderService);
const taxServiceFactory = ci.scopedResolver(tokens.TaxService);
const shippingServiceFactory = ci.scopedResolver(tokens.ShippingService);
const promoCodeServiceFactory = ci.scopedResolver(tokens.PromoCodeService);
const giftCardServiceFactory = ci.scopedResolver(tokens.GiftCardService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

const ShippingAddressSchema = {
  name: string,
  line1: string,
  line2: optional(string),
  city: string,
  state: string,
  postalCode: string,
  country: string
};

/**
 * The unified checkout orchestration (ECOM-09): cart -> order in one call,
 * with stock validated up front so a customer never pays for something
 * that's not actually there. Tax (Stripe Tax), shipping (flat-rate), promo
 * codes, and gift cards are all real, not stubs — a shipping address is
 * required because both tax and shipping need one.
 *
 * Order of operations mirrors how real storefronts price a cart: a promo
 * code discounts the pre-tax subtotal (so tax is computed on the
 * discounted amount, never the original); a gift card is a tender applied
 * against the final total (subtotal - discount + tax + shipping), same as
 * Guild's merchandising-promotions guide describes. Both are optional —
 * omitting them means exactly today's behavior.
 */
export const checkout = handlers.post(
  schemaValidator,
  '/',
  {
    name: 'Checkout',
    access: 'internal',
    summary: 'Convert a cart into an order, validating stock first',
    auth: { hmac: { secretKeys: { default: HMAC_SECRET_KEY } } },
    body: {
      cartId: string,
      shippingAddress: ShippingAddressSchema,
      promoCode: optional(string),
      giftCardCode: optional(string)
    },
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

    // Promo code discounts the pre-tax subtotal — validated (and, if valid,
    // atomically redeemed) before tax is computed on the discounted amount.
    // A bad/expired/exhausted code fails checkout outright rather than
    // silently charging full price — the customer needs to know, not be
    // surprised on their statement.
    let discountCents = 0;
    let freeShipping = false;
    if (req.body.promoCode) {
      const promoResult = await promoCodeServiceFactory().redeemPromoCode({
        code: req.body.promoCode,
        subtotalCents
      });
      if (!promoResult.valid) {
        res.status(400).send(`Promo code error: ${promoResult.reason}`);
        return;
      }
      discountCents = promoResult.discountCents;
      freeShipping = promoResult.freeShipping;
    }
    const discountedSubtotalCents = Math.max(0, subtotalCents - discountCents);

    const [taxResult, shippingResult] = await Promise.all([
      taxServiceFactory().calculate({
        // Taxed on the discounted amount, as one line — not prorated across
        // the original per-item lines, a reasonable v1 simplification.
        lineItemCents: [discountedSubtotalCents],
        shippingAddress: req.body.shippingAddress
      }),
      freeShipping
        ? Promise.resolve({ shippingCents: 0 })
        : shippingServiceFactory().calculate({
            shippingAddress: req.body.shippingAddress,
            subtotalCents: discountedSubtotalCents
          })
    ]);
    if (taxResult.estimated) {
      openTelemetryCollector.warn(
        'Order tax is a flat estimate — Stripe Tax was unreachable',
        { cartId: cart.id }
      );
    }

    const totalBeforeGiftCard =
      discountedSubtotalCents + taxResult.taxCents + shippingResult.shippingCents;

    // Gift card is a tender against the final total, not a pre-tax discount
    // — applied last, and only ever for what's actually still owed.
    let giftCardCents = 0;
    if (req.body.giftCardCode) {
      const giftCardResult = await giftCardServiceFactory().redeemGiftCard({
        code: req.body.giftCardCode,
        requestedCents: totalBeforeGiftCard
      });
      if (!giftCardResult.valid) {
        res.status(400).send(`Gift card error: ${giftCardResult.reason}`);
        return;
      }
      giftCardCents = giftCardResult.appliedCents;
    }
    const totalCents = Math.max(0, totalBeforeGiftCard - giftCardCents);

    const order = await orderServiceFactory().createOrder({
      customerId: cart.customerId,
      items: orderItems,
      shippingAddress: req.body.shippingAddress,
      subtotalCents,
      discountCents,
      taxCents: taxResult.taxCents,
      taxBreakdown: taxResult.breakdown,
      shippingCents: shippingResult.shippingCents,
      giftCardCents,
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
