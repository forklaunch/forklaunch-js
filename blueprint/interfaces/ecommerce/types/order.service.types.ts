import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

/** The order lifecycle (ECOM-07). Cancellation is legal from any pre-terminal state. */
export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FULFILLED: 'fulfilled',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

export type OrderItemDto = {
  variantId: string;
  quantity: number;
  unitPriceCents: number;
};

export type CreateOrderDto = Partial<IdDto> & {
  customerId?: string;
  items: OrderItemDto[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type UpdateOrderDto = Partial<IdDto> & {
  id: string;
  status?: OrderStatusType;
};

export type OrderDto = CreateOrderDto &
  IdDto &
  Partial<RecordTimingDto> & {
    status: OrderStatusType;
  };

/** A requested status transition; the service enforces legality (ECOM-08). */
export type TransitionOrderDto = {
  id: string;
  to: OrderStatusType;
};

export type OrderServiceParameters = {
  CreateOrderDto: CreateOrderDto;
  UpdateOrderDto: UpdateOrderDto;
  OrderDto: OrderDto;
  TransitionOrderDto: TransitionOrderDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
