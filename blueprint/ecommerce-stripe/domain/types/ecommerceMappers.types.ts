import { SchemaValidator } from '../../schema';
import { Schema } from '@forklaunch/validator';
import {
  Cart,
  GiftCard,
  Inventory,
  Order,
  Payment,
  Product,
  PromoCode,
  Review,
  Subscription,
  Variant
} from '../../persistence/entities';
import { CartMapper, CreateCartMapper, UpdateCartMapper } from '../mappers/cart.mappers';
import {
  CreateInventoryMapper,
  InventoryMapper,
  UpdateInventoryMapper
} from '../mappers/inventory.mappers';
import {
  CreateOrderMapper,
  OrderMapper,
  UpdateOrderMapper
} from '../mappers/order.mappers';
import { CreatePaymentMapper, PaymentMapper } from '../mappers/payment.mappers';
import {
  CreateProductMapper,
  ProductMapper,
  UpdateProductMapper
} from '../mappers/product.mappers';
import { CreateGiftCardMapper, GiftCardMapper } from '../mappers/giftCard.mappers';
import {
  CreatePromoCodeMapper,
  PromoCodeMapper,
  UpdatePromoCodeMapper
} from '../mappers/promoCode.mappers';
import {
  CreateReviewMapper,
  ReviewMapper,
  UpdateReviewMapper
} from '../mappers/review.mappers';
import {
  CreateSubscriptionMapper,
  SubscriptionMapper,
  UpdateSubscriptionMapper
} from '../mappers/subscription.mappers';
import {
  CreateVariantMapper,
  UpdateVariantMapper,
  VariantMapper
} from '../mappers/variant.mappers';

// product
export type ProductMapperTypes = {
  ProductMapper: typeof Product;
  CreateProductMapper: typeof Product;
  UpdateProductMapper: typeof Product;
};
export type ProductDtoTypes = {
  ProductMapper: Schema<typeof ProductMapper.schema, SchemaValidator>;
  CreateProductMapper: Schema<typeof CreateProductMapper.schema, SchemaValidator>;
  UpdateProductMapper: Schema<typeof UpdateProductMapper.schema, SchemaValidator>;
};

// variant
export type VariantMapperTypes = {
  VariantMapper: typeof Variant;
  CreateVariantMapper: typeof Variant;
  UpdateVariantMapper: typeof Variant;
};
export type VariantDtoTypes = {
  VariantMapper: Schema<typeof VariantMapper.schema, SchemaValidator>;
  CreateVariantMapper: Schema<typeof CreateVariantMapper.schema, SchemaValidator>;
  UpdateVariantMapper: Schema<typeof UpdateVariantMapper.schema, SchemaValidator>;
};

// inventory
export type InventoryMapperTypes = {
  InventoryMapper: typeof Inventory;
  CreateInventoryMapper: typeof Inventory;
  UpdateInventoryMapper: typeof Inventory;
};
export type InventoryDtoTypes = {
  InventoryMapper: Schema<typeof InventoryMapper.schema, SchemaValidator>;
  CreateInventoryMapper: Schema<
    typeof CreateInventoryMapper.schema,
    SchemaValidator
  >;
  UpdateInventoryMapper: Schema<
    typeof UpdateInventoryMapper.schema,
    SchemaValidator
  >;
};

// cart
export type CartMapperTypes = {
  CartMapper: typeof Cart;
  CreateCartMapper: typeof Cart;
  UpdateCartMapper: typeof Cart;
};
export type CartDtoTypes = {
  CartMapper: Schema<typeof CartMapper.schema, SchemaValidator>;
  CreateCartMapper: Schema<typeof CreateCartMapper.schema, SchemaValidator>;
  UpdateCartMapper: Schema<typeof UpdateCartMapper.schema, SchemaValidator>;
};

// order
export type OrderMapperTypes = {
  OrderMapper: typeof Order;
  CreateOrderMapper: typeof Order;
  UpdateOrderMapper: typeof Order;
};
export type OrderDtoTypes = {
  OrderMapper: Schema<typeof OrderMapper.schema, SchemaValidator>;
  CreateOrderMapper: Schema<typeof CreateOrderMapper.schema, SchemaValidator>;
  UpdateOrderMapper: Schema<typeof UpdateOrderMapper.schema, SchemaValidator>;
};

// payment (no update mapper — confirm/fail are provider-driven, not user-editable)
export type PaymentMapperTypes = {
  PaymentMapper: typeof Payment;
  CreatePaymentMapper: typeof Payment;
};
export type PaymentDtoTypes = {
  PaymentMapper: Schema<typeof PaymentMapper.schema, SchemaValidator>;
  CreatePaymentMapper: Schema<typeof CreatePaymentMapper.schema, SchemaValidator>;
};

// subscription
export type SubscriptionMapperTypes = {
  SubscriptionMapper: typeof Subscription;
  CreateSubscriptionMapper: typeof Subscription;
  UpdateSubscriptionMapper: typeof Subscription;
};
export type SubscriptionDtoTypes = {
  SubscriptionMapper: Schema<typeof SubscriptionMapper.schema, SchemaValidator>;
  CreateSubscriptionMapper: Schema<
    typeof CreateSubscriptionMapper.schema,
    SchemaValidator
  >;
  UpdateSubscriptionMapper: Schema<
    typeof UpdateSubscriptionMapper.schema,
    SchemaValidator
  >;
};

// review
export type ReviewMapperTypes = {
  ReviewMapper: typeof Review;
  CreateReviewMapper: typeof Review;
  UpdateReviewMapper: typeof Review;
};
export type ReviewDtoTypes = {
  ReviewMapper: Schema<typeof ReviewMapper.schema, SchemaValidator>;
  CreateReviewMapper: Schema<typeof CreateReviewMapper.schema, SchemaValidator>;
  UpdateReviewMapper: Schema<typeof UpdateReviewMapper.schema, SchemaValidator>;
};

// promo code
export type PromoCodeMapperTypes = {
  PromoCodeMapper: typeof PromoCode;
  CreatePromoCodeMapper: typeof PromoCode;
  UpdatePromoCodeMapper: typeof PromoCode;
};
export type PromoCodeDtoTypes = {
  PromoCodeMapper: Schema<typeof PromoCodeMapper.schema, SchemaValidator>;
  CreatePromoCodeMapper: Schema<
    typeof CreatePromoCodeMapper.schema,
    SchemaValidator
  >;
  UpdatePromoCodeMapper: Schema<
    typeof UpdatePromoCodeMapper.schema,
    SchemaValidator
  >;
};

// gift card (no update mapper — balance only changes via atomic redemption)
export type GiftCardMapperTypes = {
  GiftCardMapper: typeof GiftCard;
  CreateGiftCardMapper: typeof GiftCard;
};
export type GiftCardDtoTypes = {
  GiftCardMapper: Schema<typeof GiftCardMapper.schema, SchemaValidator>;
  CreateGiftCardMapper: Schema<typeof CreateGiftCardMapper.schema, SchemaValidator>;
};
