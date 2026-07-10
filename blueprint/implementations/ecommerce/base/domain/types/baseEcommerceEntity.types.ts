import {
  Cart,
  Inventory,
  Order,
  Payment,
  Product,
  Subscription,
  Variant
} from '../../persistence/entities';

// product entity types
export type BaseProductEntities = {
  ProductMapper: { '~entity': (typeof Product)['~entity'] };
  CreateProductMapper: { '~entity': (typeof Product)['~entity'] };
  UpdateProductMapper: { '~entity': (typeof Product)['~entity'] };
};

// variant entity types
export type BaseVariantEntities = {
  VariantMapper: { '~entity': (typeof Variant)['~entity'] };
  CreateVariantMapper: { '~entity': (typeof Variant)['~entity'] };
  UpdateVariantMapper: { '~entity': (typeof Variant)['~entity'] };
};

// inventory entity types
export type BaseInventoryEntities = {
  InventoryMapper: { '~entity': (typeof Inventory)['~entity'] };
  CreateInventoryMapper: { '~entity': (typeof Inventory)['~entity'] };
  UpdateInventoryMapper: { '~entity': (typeof Inventory)['~entity'] };
};

// cart entity types
export type BaseCartEntities = {
  CartMapper: { '~entity': (typeof Cart)['~entity'] };
  CreateCartMapper: { '~entity': (typeof Cart)['~entity'] };
  UpdateCartMapper: { '~entity': (typeof Cart)['~entity'] };
};

// order entity types
export type BaseOrderEntities = {
  OrderMapper: { '~entity': (typeof Order)['~entity'] };
  CreateOrderMapper: { '~entity': (typeof Order)['~entity'] };
  UpdateOrderMapper: { '~entity': (typeof Order)['~entity'] };
};

// payment entity types
export type BasePaymentEntities = {
  PaymentMapper: { '~entity': (typeof Payment)['~entity'] };
  CreatePaymentMapper: { '~entity': (typeof Payment)['~entity'] };
};

// subscription entity types
export type BaseSubscriptionEntities = {
  SubscriptionMapper: { '~entity': (typeof Subscription)['~entity'] };
  CreateSubscriptionMapper: { '~entity': (typeof Subscription)['~entity'] };
  UpdateSubscriptionMapper: { '~entity': (typeof Subscription)['~entity'] };
};
