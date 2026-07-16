import { SchemaValidator } from './schema';
import { MapToSdk } from '@forklaunch/core/http';
import {
  addCartItem,
  adjustStock,
  checkStock,
  checkout,
  clearCart,
  createCart,
  createOrder,
  createPayment,
  createProduct,
  createVariant,
  deleteProduct,
  deleteVariant,
  getCart,
  getInventory,
  getOrder,
  getPayment,
  getProduct,
  getProductByHandle,
  getVariant,
  importCatalog,
  listOrders,
  listProducts,
  listVariants,
  listVariantsByProduct,
  createGiftCard,
  createPromoCode,
  createReview,
  createSubscription,
  deletePromoCode,
  deleteReview,
  deleteSubscription,
  getGiftCard,
  getPromoCode,
  getReview,
  getSubscription,
  listGiftCards,
  listPromoCodes,
  listReviews,
  listReviewsByProduct,
  listSubscriptions,
  redeemGiftCard,
  redeemPromoCode,
  removeCartItem,
  transitionOrder,
  updateProduct,
  updatePromoCode,
  updateReview,
  updateSubscription,
  updateVariant
} from './api/controllers';

export type EcommerceSdk = {
  product: {
    createProduct: typeof createProduct;
    getProduct: typeof getProduct;
    getProductByHandle: typeof getProductByHandle;
    updateProduct: typeof updateProduct;
    deleteProduct: typeof deleteProduct;
    listProducts: typeof listProducts;
  };
  variant: {
    createVariant: typeof createVariant;
    getVariant: typeof getVariant;
    listVariantsByProduct: typeof listVariantsByProduct;
    updateVariant: typeof updateVariant;
    deleteVariant: typeof deleteVariant;
    listVariants: typeof listVariants;
  };
  inventory: {
    getInventory: typeof getInventory;
    adjustStock: typeof adjustStock;
    checkStock: typeof checkStock;
  };
  cart: {
    createCart: typeof createCart;
    getCart: typeof getCart;
    addCartItem: typeof addCartItem;
    removeCartItem: typeof removeCartItem;
    clearCart: typeof clearCart;
  };
  order: {
    createOrder: typeof createOrder;
    getOrder: typeof getOrder;
    listOrders: typeof listOrders;
    transitionOrder: typeof transitionOrder;
  };
  checkout: {
    checkout: typeof checkout;
  };
  payment: {
    createPayment: typeof createPayment;
    getPayment: typeof getPayment;
  };
  subscription: {
    createSubscription: typeof createSubscription;
    getSubscription: typeof getSubscription;
    listSubscriptions: typeof listSubscriptions;
    updateSubscription: typeof updateSubscription;
    deleteSubscription: typeof deleteSubscription;
  };
  review: {
    createReview: typeof createReview;
    getReview: typeof getReview;
    listReviews: typeof listReviews;
    listReviewsByProduct: typeof listReviewsByProduct;
    updateReview: typeof updateReview;
    deleteReview: typeof deleteReview;
  };
  promoCode: {
    createPromoCode: typeof createPromoCode;
    getPromoCode: typeof getPromoCode;
    listPromoCodes: typeof listPromoCodes;
    updatePromoCode: typeof updatePromoCode;
    deletePromoCode: typeof deletePromoCode;
    redeemPromoCode: typeof redeemPromoCode;
  };
  giftCard: {
    createGiftCard: typeof createGiftCard;
    getGiftCard: typeof getGiftCard;
    listGiftCards: typeof listGiftCards;
    redeemGiftCard: typeof redeemGiftCard;
  };
  catalogImport: {
    importCatalog: typeof importCatalog;
  };
};

export const ecommerceSdkClient = {
  product: {
    createProduct,
    getProduct,
    getProductByHandle,
    updateProduct,
    deleteProduct,
    listProducts
  },
  variant: {
    createVariant,
    getVariant,
    listVariantsByProduct,
    updateVariant,
    deleteVariant,
    listVariants
  },
  inventory: {
    getInventory,
    adjustStock,
    checkStock
  },
  cart: {
    createCart,
    getCart,
    addCartItem,
    removeCartItem,
    clearCart
  },
  order: {
    createOrder,
    getOrder,
    listOrders,
    transitionOrder
  },
  checkout: {
    checkout
  },
  payment: {
    createPayment,
    getPayment
  },
  subscription: {
    createSubscription,
    getSubscription,
    listSubscriptions,
    updateSubscription,
    deleteSubscription
  },
  review: {
    createReview,
    getReview,
    listReviews,
    listReviewsByProduct,
    updateReview,
    deleteReview
  },
  promoCode: {
    createPromoCode,
    getPromoCode,
    listPromoCodes,
    updatePromoCode,
    deletePromoCode,
    redeemPromoCode
  },
  giftCard: {
    createGiftCard,
    getGiftCard,
    listGiftCards,
    redeemGiftCard
  },
  catalogImport: {
    importCatalog
  }
} satisfies EcommerceSdk;

export type EcommerceSdkClient = MapToSdk<SchemaValidator, EcommerceSdk>;
