import { isTrue } from '@forklaunch/common';
import {
  CartDto,
  CreateCartDto,
  CreateInventoryDto,
  CreateOrderDto,
  CreatePaymentDto,
  CreateProductDto,
  CreateVariantDto,
  InventoryDto,
  OrderDto,
  OrderStatus,
  CreateSubscriptionDto,
  PaymentDto,
  ProductDto,
  SubscriptionDto,
  UpdateCartDto,
  UpdateInventoryDto,
  UpdateOrderDto,
  UpdateProductDto,
  UpdateVariantDto,
  VariantDto
} from '@forklaunch/interfaces-ecommerce/types';
import { testSchemaEquality } from '@forklaunch/internal';
import {
  CartSchema as TypeboxCartSchema,
  UpdateCartSchema as TypeboxUpdateCartSchema
} from '../domain/schemas/typebox/cart.schema';
import {
  CreateCartSchema as TypeboxCreateCartSchema
} from '../domain/schemas/typebox/cart.schema';
import {
  InventorySchema as TypeboxInventorySchema,
  UpdateInventorySchema as TypeboxUpdateInventorySchema
} from '../domain/schemas/typebox/inventory.schema';
import {
  OrderSchema as TypeboxOrderSchema,
  UpdateOrderSchema as TypeboxUpdateOrderSchema
} from '../domain/schemas/typebox/order.schema';
import {
  CreateOrderSchema as TypeboxCreateOrderSchema
} from '../domain/schemas/typebox/order.schema';
import {
  CreatePaymentSchema as TypeboxCreatePaymentSchema,
  PaymentSchema as TypeboxPaymentSchema
} from '../domain/schemas/typebox/payment.schema';
// (subscription typebox imports grouped with zod above)
import {
  CreateInventorySchema as TypeboxCreateInventorySchema
} from '../domain/schemas/typebox/inventory.schema';
import {
  ProductSchema as TypeboxProductSchema,
  UpdateProductSchema as TypeboxUpdateProductSchema
} from '../domain/schemas/typebox/product.schema';
import {
  CreateProductSchema as TypeboxCreateProductSchema
} from '../domain/schemas/typebox/product.schema';
import {
  VariantSchema as TypeboxVariantSchema,
  UpdateVariantSchema as TypeboxUpdateVariantSchema
} from '../domain/schemas/typebox/variant.schema';
import {
  CreateVariantSchema as TypeboxCreateVariantSchema
} from '../domain/schemas/typebox/variant.schema';
import {
  CartSchema as ZodCartSchema,
  UpdateCartSchema as ZodUpdateCartSchema
} from '../domain/schemas/zod/cart.schema';
import {
  CreateCartSchema as ZodCreateCartSchema
} from '../domain/schemas/zod/cart.schema';
import {
  InventorySchema as ZodInventorySchema,
  UpdateInventorySchema as ZodUpdateInventorySchema
} from '../domain/schemas/zod/inventory.schema';
import {
  OrderSchema as ZodOrderSchema,
  UpdateOrderSchema as ZodUpdateOrderSchema
} from '../domain/schemas/zod/order.schema';
import {
  CreateOrderSchema as ZodCreateOrderSchema
} from '../domain/schemas/zod/order.schema';
import {
  CreatePaymentSchema as ZodCreatePaymentSchema,
  PaymentSchema as ZodPaymentSchema
} from '../domain/schemas/zod/payment.schema';
import {
  CreateSubscriptionSchema as ZodCreateSubscriptionSchema,
  SubscriptionSchema as ZodSubscriptionSchema
} from '../domain/schemas/zod/subscription.schema';
import {
  CreateSubscriptionSchema as TypeboxCreateSubscriptionSchema,
  SubscriptionSchema as TypeboxSubscriptionSchema
} from '../domain/schemas/typebox/subscription.schema';
import {
  CreateInventorySchema as ZodCreateInventorySchema
} from '../domain/schemas/zod/inventory.schema';
import {
  ProductSchema as ZodProductSchema,
  UpdateProductSchema as ZodUpdateProductSchema
} from '../domain/schemas/zod/product.schema';
import {
  CreateProductSchema as ZodCreateProductSchema
} from '../domain/schemas/zod/product.schema';
import {
  VariantSchema as ZodVariantSchema,
  UpdateVariantSchema as ZodUpdateVariantSchema
} from '../domain/schemas/zod/variant.schema';
import {
  CreateVariantSchema as ZodCreateVariantSchema
} from '../domain/schemas/zod/variant.schema';

const zodUpdateProductSchema = ZodUpdateProductSchema({ uuidId: false });
const typeboxUpdateProductSchema = TypeboxUpdateProductSchema({ uuidId: false });
const zodProductSchema = ZodProductSchema({ uuidId: false });
const typeboxProductSchema = TypeboxProductSchema({ uuidId: false });

const zodUpdateVariantSchema = ZodUpdateVariantSchema({ uuidId: false });
const typeboxUpdateVariantSchema = TypeboxUpdateVariantSchema({ uuidId: false });
const zodVariantSchema = ZodVariantSchema({ uuidId: false });
const typeboxVariantSchema = TypeboxVariantSchema({ uuidId: false });

const zodUpdateInventorySchema = ZodUpdateInventorySchema({ uuidId: false });
const typeboxUpdateInventorySchema = TypeboxUpdateInventorySchema({
  uuidId: false
});
const zodInventorySchema = ZodInventorySchema({ uuidId: false });
const typeboxInventorySchema = TypeboxInventorySchema({ uuidId: false });

const sampleOptions = [{ name: 'Size', isPackQuantity: false, values: ['S'] }];
const sampleImages = [{ src: 'https://example.com/a.jpg', position: 1 }];

const zodUpdateCartSchema = ZodUpdateCartSchema({ uuidId: false });
const typeboxUpdateCartSchema = TypeboxUpdateCartSchema({ uuidId: false });
const zodCartSchema = ZodCartSchema({ uuidId: false });
const typeboxCartSchema = TypeboxCartSchema({ uuidId: false });

const zodUpdateOrderSchema = ZodUpdateOrderSchema({ uuidId: false });
const typeboxUpdateOrderSchema = TypeboxUpdateOrderSchema({ uuidId: false });
const zodOrderSchema = ZodOrderSchema({ uuidId: false });
const typeboxOrderSchema = TypeboxOrderSchema({ uuidId: false });

const zodSubscriptionSchema = ZodSubscriptionSchema({ uuidId: false });
const typeboxSubscriptionSchema = TypeboxSubscriptionSchema({ uuidId: false });

const sampleCartItems = [{ variantId: 'var-1', quantity: 2 }];
const sampleOrderItems = [
  { variantId: 'var-1', quantity: 2, unitPriceCents: 1999 }
];
const sampleShippingAddress = {
  name: 'Jane Doe',
  line1: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62704',
  country: 'US'
};
const sampleTaxBreakdown = [{ jurisdiction: 'IL', taxCents: 320 }];

describe('schema equality', () => {
  it('should be equal for product', () => {
    expect(
      isTrue(
        testSchemaEquality<CreateProductDto>()(
          ZodCreateProductSchema,
          TypeboxCreateProductSchema,
          {
            externalId: 'ext-1',
            handle: 'test-product',
            sourceUrl: 'https://example.com/products/test-product',
            title: 'Test Product',
            descriptionHtml: '<p>desc</p>',
            vendor: 'Test Vendor',
            productType: 'Supplement',
            tags: ['a', 'b'],
            options: sampleOptions,
            images: sampleImages
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<UpdateProductDto>()(
          zodUpdateProductSchema,
          typeboxUpdateProductSchema,
          {
            id: 'test',
            title: 'Updated'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<ProductDto>()(zodProductSchema, typeboxProductSchema, {
          id: 'test',
          externalId: 'ext-1',
          handle: 'test-product',
          title: 'Test Product',
          options: sampleOptions,
          images: sampleImages
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for variant', () => {
    expect(
      isTrue(
        testSchemaEquality<CreateVariantDto>()(
          ZodCreateVariantSchema,
          TypeboxCreateVariantSchema,
          {
            productId: 'prod-1',
            externalId: 'var-1',
            sku: '12345',
            title: 'Black',
            optionValues: { Color: 'Black' },
            priceCents: 1999,
            compareAtPriceCents: 2499,
            requiresShipping: true
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<UpdateVariantDto>()(
          zodUpdateVariantSchema,
          typeboxUpdateVariantSchema,
          {
            id: 'test',
            priceCents: 999
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<VariantDto>()(zodVariantSchema, typeboxVariantSchema, {
          id: 'test',
          productId: 'prod-1',
          externalId: 'var-1',
          title: 'Black',
          priceCents: 1999
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for inventory', () => {
    expect(
      isTrue(
        testSchemaEquality<CreateInventoryDto>()(
          ZodCreateInventorySchema,
          TypeboxCreateInventorySchema,
          {
            variantId: 'var-1',
            stock: 100
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<UpdateInventoryDto>()(
          zodUpdateInventorySchema,
          typeboxUpdateInventorySchema,
          {
            id: 'test',
            stock: 50
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<InventoryDto>()(
          zodInventorySchema,
          typeboxInventorySchema,
          {
            id: 'test',
            variantId: 'var-1',
            stock: 100
          }
        )
      )
    ).toBeTruthy();
  });

  it('should be equal for cart', () => {
    expect(
      isTrue(
        testSchemaEquality<CreateCartDto>()(
          ZodCreateCartSchema,
          TypeboxCreateCartSchema,
          { customerId: 'cust-1' }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<UpdateCartDto>()(
          zodUpdateCartSchema,
          typeboxUpdateCartSchema,
          { id: 'test', customerId: 'cust-1' }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<CartDto>()(zodCartSchema, typeboxCartSchema, {
          id: 'test',
          customerId: 'cust-1',
          status: 'open',
          items: sampleCartItems
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for order', () => {
    expect(
      isTrue(
        testSchemaEquality<CreateOrderDto>()(
          ZodCreateOrderSchema,
          TypeboxCreateOrderSchema,
          {
            customerId: 'cust-1',
            items: sampleOrderItems,
            shippingAddress: sampleShippingAddress,
            subtotalCents: 3998,
            taxCents: 320,
            taxBreakdown: sampleTaxBreakdown,
            shippingCents: 500,
            totalCents: 4818
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<UpdateOrderDto>()(
          zodUpdateOrderSchema,
          typeboxUpdateOrderSchema,
          { id: 'test', status: OrderStatus.PAID }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<OrderDto>()(zodOrderSchema, typeboxOrderSchema, {
          id: 'test',
          customerId: 'cust-1',
          status: OrderStatus.PENDING,
          items: sampleOrderItems,
          shippingAddress: sampleShippingAddress,
          subtotalCents: 3998,
          taxCents: 320,
          taxBreakdown: sampleTaxBreakdown,
          shippingCents: 500,
          totalCents: 4818
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for payment', () => {
    expect(
      isTrue(
        testSchemaEquality<CreatePaymentDto>()(
          ZodCreatePaymentSchema,
          TypeboxCreatePaymentSchema,
          {
            orderId: 'order-1',
            amountCents: 4318,
            currency: 'usd'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<PaymentDto>()(ZodPaymentSchema, TypeboxPaymentSchema, {
          id: 'test',
          orderId: 'order-1',
          amountCents: 4318,
          currency: 'usd',
          status: 'pending',
          providerRef: 'pi_123'
        })
      )
    ).toBeTruthy();
  });

  it('should be equal for subscription', () => {
    expect(
      isTrue(
        testSchemaEquality<CreateSubscriptionDto>()(
          ZodCreateSubscriptionSchema,
          TypeboxCreateSubscriptionSchema,
          {
            customerId: 'cust-1',
            items: [{ variantId: 'var-1', quantity: 1 }],
            intervalDays: 30,
            nextOrderAt: new Date(),
            providerSubRef: 'sub_123'
          }
        )
      )
    ).toBeTruthy();

    expect(
      isTrue(
        testSchemaEquality<SubscriptionDto>()(
          zodSubscriptionSchema,
          typeboxSubscriptionSchema,
          {
            id: 'test',
            customerId: 'cust-1',
            items: [{ variantId: 'var-1', quantity: 1 }],
            intervalDays: 30,
            status: 'active',
            nextOrderAt: new Date(),
            providerSubRef: 'sub_123'
          }
        )
      )
    ).toBeTruthy();
  });
});
