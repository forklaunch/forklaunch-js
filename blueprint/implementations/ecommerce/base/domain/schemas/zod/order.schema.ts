import {
  array,
  date,
  enum_,
  number,
  optional,
  string,
  uuid
} from '@forklaunch/validator/zod';

/** Mirrors OrderStatus from @forklaunch/interfaces-ecommerce/types (schemas can't import runtime consts across the boundary cleanly, so the literal union is restated here). */
const OrderStatusEnum = {
  PENDING: 'pending',
  PAID: 'paid',
  FULFILLED: 'fulfilled',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

const OrderItemSchema = {
  variantId: string,
  quantity: number,
  unitPriceCents: number
};

export const CreateOrderSchema = {
  customerId: optional(string),
  items: array(OrderItemSchema),
  subtotalCents: number,
  taxCents: number,
  totalCents: number
};

export const UpdateOrderSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  status: optional(enum_(OrderStatusEnum))
});

export const OrderSchema = ({ uuidId }: { uuidId: boolean }) => ({
  id: uuidId ? uuid : string,
  customerId: optional(string),
  status: enum_(OrderStatusEnum),
  items: array(OrderItemSchema),
  subtotalCents: number,
  taxCents: number,
  totalCents: number,
  createdAt: optional(date),
  updatedAt: optional(date)
});

export const TransitionOrderSchema = {
  id: string,
  to: enum_(OrderStatusEnum)
};

export const BaseOrderServiceSchemas = (options: { uuidId: boolean }) => ({
  CreateOrderSchema,
  UpdateOrderSchema: UpdateOrderSchema(options),
  OrderSchema: OrderSchema(options)
});
