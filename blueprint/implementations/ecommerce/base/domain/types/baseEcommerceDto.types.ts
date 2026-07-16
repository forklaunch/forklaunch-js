import {
  CartDto,
  CreateCartDto,
  CreateGiftCardDto,
  CreateInventoryDto,
  CreateOrderDto,
  CreateProductDto,
  CreatePromoCodeDto,
  CreateReviewDto,
  CreateVariantDto,
  GiftCardDto,
  InventoryDto,
  CreatePaymentDto,
  CreateSubscriptionDto,
  OrderDto,
  PaymentDto,
  ProductDto,
  PromoCodeDto,
  ReviewDto,
  SubscriptionDto,
  UpdateCartDto,
  UpdateInventoryDto,
  UpdateOrderDto,
  UpdateProductDto,
  UpdatePromoCodeDto,
  UpdateReviewDto,
  UpdateSubscriptionDto,
  UpdateVariantDto,
  VariantDto
} from '@forklaunch/interfaces-ecommerce/types';

// product dto types
export type BaseProductDtos = {
  ProductMapper: ProductDto;
  CreateProductMapper: CreateProductDto;
  UpdateProductMapper: UpdateProductDto;
};

// variant dto types
export type BaseVariantDtos = {
  VariantMapper: VariantDto;
  CreateVariantMapper: CreateVariantDto;
  UpdateVariantMapper: UpdateVariantDto;
};

// inventory dto types
export type BaseInventoryDtos = {
  InventoryMapper: InventoryDto;
  CreateInventoryMapper: CreateInventoryDto;
  UpdateInventoryMapper: UpdateInventoryDto;
};

// cart dto types
export type BaseCartDtos = {
  CartMapper: CartDto;
  CreateCartMapper: CreateCartDto;
  UpdateCartMapper: UpdateCartDto;
};

// order dto types
export type BaseOrderDtos = {
  OrderMapper: OrderDto;
  CreateOrderMapper: CreateOrderDto;
  UpdateOrderMapper: UpdateOrderDto;
};

// payment dto types
export type BasePaymentDtos = {
  PaymentMapper: PaymentDto;
  CreatePaymentMapper: CreatePaymentDto;
};

// subscription dto types
export type BaseSubscriptionDtos = {
  SubscriptionMapper: SubscriptionDto;
  CreateSubscriptionMapper: CreateSubscriptionDto;
  UpdateSubscriptionMapper: UpdateSubscriptionDto;
};

// review dto types
export type BaseReviewDtos = {
  ReviewMapper: ReviewDto;
  CreateReviewMapper: CreateReviewDto;
  UpdateReviewMapper: UpdateReviewDto;
};

// promo code dto types
export type BasePromoCodeDtos = {
  PromoCodeMapper: PromoCodeDto;
  CreatePromoCodeMapper: CreatePromoCodeDto;
  UpdatePromoCodeMapper: UpdatePromoCodeDto;
};

// gift card dto types
export type BaseGiftCardDtos = {
  GiftCardMapper: GiftCardDto;
  CreateGiftCardMapper: CreateGiftCardDto;
};
